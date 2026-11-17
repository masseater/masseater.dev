# @masseater.dev/pod-rattle-engine

This workspace is the Pod Rattle sound engine, written in Rust.

- Judge performance by instruction counts from the Valgrind benchmarks, not by time. CI runners differ in speed, so time-based checks fail on some machines.
- Do not allocate on the audio thread. Allocate arrays when the engine is initialized.
- The parity tests compare the sound with the sound of the labs page. When you change the sound in labs, change this engine too. Keep the order of floating-point operations even when optimizing.
