# Track 3 requirements

## Source status

This brief is normalized from `docs/raw/track-3.txt`.
The Spanish terms and conditions in `docs/raw/T&C.pdf` and the rules summary in `docs/raw/rules` provide the shared competition requirements.

## Challenge

The challenge is to build an AI solution that works where the cloud does not reach, should not reach, or costs too much.

The problem area is open.
Suggested areas include intermittent connectivity, sensitive data that should remain local, field work, accessibility, and local agents that execute actions.

## Must

The solution must be built using the QVAC SDK.

The solution must execute inference on-device or delegate inference peer-to-peer.

Routing inference to a cloud API disqualifies the submission.

The repository must be accessible to the jury during evaluation.

The submission must include a demonstration video of no more than five minutes with an accessible link.

The README must declare all pre-existing work used in the submission.

## Should

The solution should solve a real problem.

The solution should demonstrate a useful experience rather than only a technical experiment.

The implementation should take advantage of conditions where local or peer-to-peer execution is valuable.

## Could

The solution could use Pears for communication or peer-to-peer inference delegation.

The solution could use cloud services for non-inference functions such as hosting.

## Evaluation

The general evaluation weights are Technical 35%, Innovation 25%, Impact 20%, Design 10%, and Completion 10%.

## Open questions

- The problem domain is not fixed.
- The target user is not fixed.
- The interface is not fixed.
- The use of Pears is optional.
- The target hardware and model are not fixed.

## Shared requirements

See [`../../../docs/requirements.md`](../../../docs/requirements.md) for shared QVAC, local inference, submission, and evaluation requirements.
