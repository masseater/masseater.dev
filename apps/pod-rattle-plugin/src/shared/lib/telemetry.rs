use std::sync::Mutex;

use pod_rattle_engine::Snapshot;
use triple_buffer::TripleBuffer;

pub struct Telemetry {
    pub snapshot: Mutex<triple_buffer::Output<Snapshot>>,
}

impl Telemetry {
    #[must_use]
    pub fn new() -> (Self, triple_buffer::Input<Snapshot>) {
        let (input, output) = TripleBuffer::new(&Snapshot::default()).split();
        let telemetry = Self {
            snapshot: Mutex::new(output),
        };
        (telemetry, input)
    }
}
