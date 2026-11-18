use candle_core::{D, Result, Tensor};
use candle_nn::{
    Linear, Module, VarBuilder, linear, linear_no_bias, ops::sigmoid, ops::softmax_last_dim,
};

use super::norm::RmsNorm;

const ATTENTION_ELEMENTS: usize = 1 << 28;

pub struct Rotary {
    freqs: Tensor,
}

impl Rotary {
    pub fn new(dim_head: usize, vb: &VarBuilder) -> Result<Self> {
        Ok(Self {
            freqs: vb.get(dim_head / 2, "freqs")?,
        })
    }

    fn tables(&self, len: usize) -> Result<(Tensor, Tensor)> {
        let positions =
            Tensor::arange(0u32, len as u32, self.freqs.device())?.to_dtype(self.freqs.dtype())?;
        let angles = positions
            .unsqueeze(1)?
            .broadcast_mul(&self.freqs.unsqueeze(0)?)?;
        let half = angles.dim(1)?;
        let interleaved = Tensor::stack(&[&angles, &angles], 2)?.reshape((len, half * 2))?;
        Ok((interleaved.cos()?, interleaved.sin()?))
    }

    pub fn rotate(&self, x: &Tensor) -> Result<Tensor> {
        let (batch, heads, len, dim) = x.dims4()?;
        let (cos, sin) = self.tables(len)?;
        let pairs = x.reshape((batch, heads, len, dim / 2, 2))?;
        let first = pairs.narrow(4, 0, 1)?;
        let second = pairs.narrow(4, 1, 1)?;
        let rotated =
            Tensor::cat(&[&second.neg()?, &first], 4)?.reshape((batch, heads, len, dim))?;
        x.broadcast_mul(&cos)? + rotated.broadcast_mul(&sin)?
    }
}

pub struct Attention {
    norm: RmsNorm,
    to_qkv: Linear,
    to_gates: Linear,
    to_out: Linear,
    rotary: Rotary,
    heads: usize,
    dim_head: usize,
}

impl Attention {
    pub fn new(dim: usize, heads: usize, dim_head: usize, vb: &VarBuilder) -> Result<Self> {
        let inner = heads * dim_head;
        Ok(Self {
            norm: RmsNorm::new(dim, &vb.pp("norm"))?,
            to_qkv: linear_no_bias(dim, inner * 3, vb.pp("to_qkv"))?,
            to_gates: linear(dim, heads, vb.pp("to_gates"))?,
            to_out: linear_no_bias(inner, dim, vb.pp("to_out.0"))?,
            rotary: Rotary::new(dim_head, &vb.pp("rotary_embed"))?,
            heads,
            dim_head,
        })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        let (batch, len, _) = x.dims3()?;
        let x = self.norm.forward(x)?;
        let qkv = self
            .to_qkv
            .forward(&x)?
            .reshape((batch, len, 3, self.heads, self.dim_head))?
            .permute((2, 0, 3, 1, 4))?;
        let q = self.rotary.rotate(&qkv.get(0)?.contiguous()?)?;
        let k = self.rotary.rotate(&qkv.get(1)?.contiguous()?)?;
        let v = qkv.get(2)?.contiguous()?;
        let scale = (self.dim_head as f64).powf(-0.5);
        let slice = (ATTENTION_ELEMENTS / (self.heads * len * len)).max(1);
        let parts = (0..batch)
            .step_by(slice)
            .map(|start| {
                let size = slice.min(batch - start);
                let (q, k, v) = (
                    q.narrow(0, start, size)?,
                    k.narrow(0, start, size)?,
                    v.narrow(0, start, size)?,
                );
                softmax_last_dim(&(q.matmul(&k.t()?)? * scale)?)?.matmul(&v)
            })
            .collect::<Result<Vec<_>>>()?;
        let out = Tensor::cat(&parts, 0)?;
        let gates = sigmoid(&self.to_gates.forward(&x)?)?
            .permute((0, 2, 1))?
            .unsqueeze(D::Minus1)?;
        let out = out.broadcast_mul(&gates)?.permute((0, 2, 1, 3))?.reshape((
            batch,
            len,
            self.heads * self.dim_head,
        ))?;
        self.to_out.forward(&out)
    }
}

pub struct FeedForward {
    norm: RmsNorm,
    up: Linear,
    down: Linear,
}

impl FeedForward {
    pub fn new(dim: usize, mult: usize, vb: &VarBuilder) -> Result<Self> {
        let inner = dim * mult;
        Ok(Self {
            norm: RmsNorm::new(dim, &vb.pp("net.0"))?,
            up: linear(dim, inner, vb.pp("net.1"))?,
            down: linear(inner, dim, vb.pp("net.4"))?,
        })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        self.down
            .forward(&self.up.forward(&self.norm.forward(x)?)?.gelu_erf()?)
    }
}

pub struct Transformer {
    layers: Vec<(Attention, FeedForward)>,
}

impl Transformer {
    pub fn new(
        depth: usize,
        dim: usize,
        heads: usize,
        dim_head: usize,
        vb: &VarBuilder,
    ) -> Result<Self> {
        let layers = (0..depth)
            .map(|index| {
                let layer = vb.pp(format!("layers.{index}"));
                Ok((
                    Attention::new(dim, heads, dim_head, &layer.pp("0"))?,
                    FeedForward::new(dim, 4, &layer.pp("1"))?,
                ))
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(Self { layers })
    }

    pub fn forward(&self, x: &Tensor) -> Result<Tensor> {
        self.layers
            .iter()
            .try_fold(x.clone(), |x, (attention, feed_forward)| {
                let x = (attention.forward(&x)? + &x)?;
                feed_forward.forward(&x)? + &x
            })
    }
}
