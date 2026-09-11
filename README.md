# Faraday

Faraday reviews hostile documents against a confidential corpus with local QVAC inference.
The documents and corpus are fictitious seed data.

## Run with Docker Compose

Download weights on the host, not in a container.
They are mounted read-only into the only model-running service.

```sh
mkdir -p models
curl -L -C - -o models/Qwen3-8B-Q4_K_M.gguf \
  https://huggingface.co/Qwen/Qwen3-8B-GGUF/resolve/main/Qwen3-8B-Q4_K_M.gguf
curl -L -C - -o models/Qwen3-4B-Q4_K_M.gguf \
  https://huggingface.co/unsloth/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf
grep 'Qwen3-[48]B-Q4_K_M.gguf' models.sha256 | sha256sum -c -
```

The published SHA-256 values are versioned in [`models.sha256`](./models.sha256).
From a worktree, point Compose at the host directory if it is not at the default path:

```sh
FARADAY_MODELS_DIR=/absolute/path/to/models docker compose up --build
```

`inference` has `network_mode: none`, mounts the weights at `/models` read-only, and is the only service that loads QVAC.
`web` runs orchestration and communicates with inference only through one request directory per model call in the shared `jobs` volume.
Run the tracer-bullet review through that file drop with:

```sh
docker compose exec web npm run review -- \
  documents/procurement/propuesta-hostil.pdf propuesta /work/jobs/review
```

## GPU override

CPU is the default.
For Vulkan, install NVIDIA's `nvidia-container-toolkit`, ensure Docker's CDI spec is generated, and include `graphics` in `NVIDIA_DRIVER_CAPABILITIES`.
The override uses Docker CDI (`nvidia.com/gpu=all`), not `--gpus all` or the legacy `nvidia` driver.

```sh
docker compose -f compose.yml -f compose.gpu.yml up --build
```

Before loading a model, verify the GPU and Vulkan ICD are visible in the inference image:

```sh
docker compose -f compose.yml -f compose.gpu.yml run --rm --no-deps \
  --entrypoint sh inference -c 'nvidia-smi && test -f /etc/vulkan/icd.d/nvidia_icd.json'
```

## Containment check

The fast container check uses the scripted model inside `inference`, never loads weights or a GPU, and verifies the no-network proof, file-drop round trip and review command.

```sh
npm run check:containment
```
