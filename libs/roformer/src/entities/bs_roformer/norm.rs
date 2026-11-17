use candle_core::{D, Result, Tensor};
use candle_nn::VarBuilder;

pub struct RmsNorm {
    gamma: Tensor,
    scale: f64,
}

impl RmsNorm {
    pub fn new(dim: usize, vb: &VarBuilder) -> Result<Self> {
        Ok(Self {
            gamma: vb.get(dim, "gamma")?,
            scale: (dim as f64).sqrt(),
        })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        let norm = x
            .sqr()?
            .sum_keepdim(D::Minus1)?
            .sqrt()?
            .clamp(1e-12, f64::INFINITY)?;
        (x.broadcast_div(&norm)? * self.scale)?.broadcast_mul(&self.gamma)
    }
}
