# NVIDIA Vulkan fallback inside the inference container

## Observed failure

The host NVIDIA GeForce RTX 4050 works through Vulkan, but QVAC resolves its backend to CPU inside the inference container.
Docker CDI correctly injects the GPU device nodes, NVIDIA driver 610.57.04, Vulkan ICD manifest, and graphics libraries.
QVAC receives `device: gpu` and `gpu_layers: 99`, but its runtime stats report `backendDevice: cpu`.
A direct Vulkan backend probe inside the container fails because `libGLX_nvidia.so.0` cannot provide `vkCreateInstance` through `vk_icdGetInstanceProcAddr`.
The container has `libvulkan1`, `libglvnd0`, and `libglx0`, but does not have the `libegl1` package.

## Primary-source findings

NVIDIA documents that `NVIDIA_DRIVER_CAPABILITIES` replaces the default capability set and that graphics workloads must request the `graphics` capability.
The current Compose GPU override already requests `compute,utility,graphics`.
Source: [NVIDIA Container Toolkit specialized Docker configurations](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html).

NVIDIA documents CDI automatic generation, refresh, inspection, and manual regeneration.
The current CDI specification is current and includes the RTX 4050, `/dev/nvidia-modeset`, `/dev/dri` links, Vulkan ICD files, and the `update-application-profile` hook.
Source: [NVIDIA Container Toolkit CDI support](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/cdi-support.html).

NVIDIA issue 191 reports the exact `vkCreateInstance` and `vk_icdGetInstanceProcAddr` error seen here.
Users resolved it by installing `libegl1`, and an NVIDIA maintainer closed the issue after confirming that the required GLX stack must exist inside the container.
Source: [NVIDIA/nvidia-container-toolkit issue 191](https://github.com/NVIDIA/nvidia-container-toolkit/issues/191).

NVIDIA issue 1472 provides a maintainer-tested container command where installing `libxext6` and `libegl1` makes `vulkaninfo` detect the NVIDIA GPU.
This image already receives `libxext6` transitively but is missing `libegl1`.
Source: [NVIDIA/nvidia-container-toolkit issue 1472](https://github.com/NVIDIA/nvidia-container-toolkit/issues/1472#issuecomment-3557280496).

NVIDIA Container Toolkit 1.20 added a CDI application-profile hook for coherent EGL and Vulkan GPU visibility.
The generated CDI specification on this host already contains that hook, so the fixed multi-GPU visibility issue does not explain this single-GPU initialization failure.
Sources: [NVIDIA Container Toolkit 1.20 release](https://github.com/NVIDIA/nvidia-container-toolkit/releases/tag/v1.20.0) and [PR 1939](https://github.com/NVIDIA/nvidia-container-toolkit/pull/1939).

QVAC's llama.cpp documentation requires `device: gpu` and model-layer offload through `gpu_layers`.
The app now explicitly requests `gpu_layers: 99` for its GPU configuration.
Source: [QVAC llm-llamacpp README](https://github.com/tetherto/qvac/tree/main/packages/llm-llamacpp#readme).

## Ranked hypotheses

1. The missing `libegl1` runtime dependency prevents the injected NVIDIA GLX ICD from initializing Vulkan.
Prediction: installing `libegl1` in an otherwise unchanged image will make the direct Vulkan probe enumerate the RTX 4050, and QVAC will report `backendDevice: gpu`.
2. The CDI specification is stale or incomplete.
Prediction: regenerating it would add a missing device, graphics mount, or application-profile hook, but inspection shows all three are already present.
3. The graphics capability is absent.
Prediction: adding `graphics` would expose the ICD and libraries, but the current container already has that capability and those files.
4. The old Debian Vulkan loader is incompatible with the host driver.
Prediction: a newer base image would initialize Vulkan without any additional package, but this is less consistent with NVIDIA's exact documented solution for the observed error.

## Experiment result

Installing only `libegl1` in an isolated copy of the existing image made QVAC's Vulkan backend enumerate the NVIDIA GeForce RTX 4050.
This confirmed the first hypothesis and falsified the loader-version hypothesis.

The production Dockerfile now installs `libegl1` explicitly.
The GPU model configuration also explicitly sets `gpu_layers: 99` whenever `FARADAY_DEVICE=gpu` so all model layers are eligible for offload.

After rebuilding, Qwen3-8B held approximately 5.4 GiB of VRAM and appeared in `nvidia-smi` as the QVAC Bare worker.
A real file-drop inference request reached 100 percent sampled GPU utilization and completed in approximately 6.2 seconds.
The web endpoint remained available at `http://localhost:3000`.
