# @masseater.dev/roformer

This workspace is a Rust library that runs BS-RoFormer source separation models. It reads the PyTorch checkpoints published by the community directly, without converting them.

Tests download weights and PyTorch outputs pinned to a Hugging Face revision, and check that the outputs match.
