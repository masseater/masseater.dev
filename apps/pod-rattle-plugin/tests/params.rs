use nice_plug::prelude::{FloatParam, Param};
use pod_rattle::RattleParams;

#[test]
fn every_value_survives_a_round_trip_through_its_text() {
    let p = RattleParams::default();
    let floats: [&FloatParam; 15] = [
        &p.material,
        &p.decay,
        &p.pitch,
        &p.rest,
        &p.bright,
        &p.spread,
        &p.hi_decay,
        &p.hard,
        &p.len,
        &p.rate,
        &p.amp,
        &p.hand_x,
        &p.hand_y,
        &p.hand_z,
        &p.gain,
    ];
    for param in floats {
        for step in 0..=990 {
            let normalized = step as f32 / 990.0;
            let text = param.normalized_value_to_string(normalized, true);
            let back = param
                .string_to_normalized_value(&text)
                .unwrap_or_else(|| panic!("{} cannot read {text:?}", param.name()));
            let again = param.normalized_value_to_string(back, true);
            assert_eq!(
                text,
                again,
                "{} at {normalized}: {text:?} -> {back} -> {again:?}",
                param.name()
            );
        }
    }
}
