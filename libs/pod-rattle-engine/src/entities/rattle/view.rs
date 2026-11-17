use super::params::MAX_PODS;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct PodView {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub radius: f32,
    pub flash: f32,
    pub knot_x: f32,
    pub knot_z: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Snapshot {
    pub count: usize,
    pub hand: [f32; 3],
    pub hit_rate: f32,
    pub material: f32,
    pub pods: [PodView; MAX_PODS],
}

impl Default for Snapshot {
    fn default() -> Self {
        Self {
            count: 0,
            hand: [0.0; 3],
            hit_rate: 0.0,
            material: 0.0,
            pods: [PodView::default(); MAX_PODS],
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Info {
    pub stiffness: f64,
    pub t60: f64,
    pub f0: f64,
    pub top_frequency: f64,
    pub contact_time: f64,
}
