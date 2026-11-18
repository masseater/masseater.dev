use candle_core::{D, Result, Tensor};
use candle_nn::{Linear, Module, VarBuilder, linear, ops::sigmoid};

use super::attention::Transformer;
use super::config::BsRoformerConfig;
use super::norm::RmsNorm;

struct Band {
    norm: RmsNorm,
    to_feature: Linear,
}

struct MaskBand {
    layers: Vec<Linear>,
}

impl MaskBand {
    fn forward(&self, x: &Tensor) -> Result<Tensor> {
        let last = self.layers.len() - 1;
        let out = self
            .layers
            .iter()
            .enumerate()
            .try_fold(x.clone(), |x, (index, layer)| {
                let y = layer.forward(&x)?;
                if index == last { Ok(y) } else { y.tanh() }
            })?;
        let half = out.dim(D::Minus1)? / 2;
        out.narrow(D::Minus1, 0, half)?
            .mul(&sigmoid(&out.narrow(D::Minus1, half, half)?)?)
    }
}

pub struct BsRoformer {
    bands: Vec<Band>,
    band_widths: Vec<usize>,
    layers: Vec<(Transformer, Transformer)>,
    final_norm: RmsNorm,
    mask_estimators: Vec<Vec<MaskBand>>,
}

impl BsRoformer {
    pub fn new(config: &BsRoformerConfig, vb: &VarBuilder) -> Result<Self> {
        let band_widths: Vec<usize> = config
            .freqs_per_bands
            .iter()
            .map(|freqs| freqs * 2 * 2)
            .collect();
        let bands = band_widths
            .iter()
            .enumerate()
            .map(|(index, &width)| {
                let band = vb.pp(format!("band_split.to_features.{index}"));
                Ok(Band {
                    norm: RmsNorm::new(width, &band.pp("0"))?,
                    to_feature: linear(width, config.dim, band.pp("1"))?,
                })
            })
            .collect::<Result<Vec<_>>>()?;
        let layers = (0..config.depth)
            .map(|index| {
                let layer = vb.pp(format!("layers.{index}"));
                Ok((
                    Transformer::new(
                        config.time_transformer_depth,
                        config.dim,
                        config.heads,
                        config.dim_head,
                        &layer.pp("0"),
                    )?,
                    Transformer::new(
                        config.freq_transformer_depth,
                        config.dim,
                        config.heads,
                        config.dim_head,
                        &layer.pp("1"),
                    )?,
                ))
            })
            .collect::<Result<Vec<_>>>()?;
        let hidden = config.dim * config.mlp_expansion_factor;
        let mask_estimators = (0..config.num_stems)
            .map(|stem| {
                band_widths
                    .iter()
                    .enumerate()
                    .map(|(index, &width)| {
                        let mlp = vb.pp(format!("mask_estimators.{stem}.to_freqs.{index}.0"));
                        let dims: Vec<usize> = std::iter::once(config.dim)
                            .chain(std::iter::repeat_n(hidden, config.mask_estimator_depth - 1))
                            .chain(std::iter::once(width * 2))
                            .collect();
                        let layers = dims
                            .windows(2)
                            .enumerate()
                            .map(|(position, pair)| {
                                linear(pair[0], pair[1], mlp.pp((position * 2).to_string()))
                            })
                            .collect::<Result<Vec<_>>>()?;
                        Ok(MaskBand { layers })
                    })
                    .collect::<Result<Vec<_>>>()
            })
            .collect::<Result<Vec<_>>>()?;
        Ok(Self {
            bands,
            band_widths,
            layers,
            final_norm: RmsNorm::new(config.dim, &vb.pp("final_norm"))?,
            mask_estimators,
        })
    }

    pub fn forward_spectrum(&self, real: &Tensor, imag: &Tensor) -> Result<(Tensor, Tensor)> {
        let (batch, channels, freqs, frames) = real.dims4()?;
        let spectrum = Tensor::stack(&[real, imag], 4)?;
        let features =
            spectrum
                .permute((0, 3, 2, 1, 4))?
                .reshape((batch, frames, freqs * channels * 2))?;
        let mut offset = 0;
        let mut band_outputs = Vec::with_capacity(self.bands.len());
        for (band, &width) in self.bands.iter().zip(&self.band_widths) {
            let slice = features.narrow(2, offset, width)?;
            band_outputs.push(band.to_feature.forward(&band.norm.forward(&slice)?)?);
            offset += width;
        }
        let mut x = Tensor::stack(&band_outputs, 2)?;
        let (_, _, band_count, dim) = x.dims4()?;
        for (time, freq) in &self.layers {
            let by_time = x
                .permute((0, 2, 1, 3))?
                .reshape((batch * band_count, frames, dim))?;
            let by_time = time
                .forward(&by_time)?
                .reshape((batch, band_count, frames, dim))?;
            let by_freq =
                by_time
                    .permute((0, 2, 1, 3))?
                    .reshape((batch * frames, band_count, dim))?;
            x = freq
                .forward(&by_freq)?
                .reshape((batch, frames, band_count, dim))?;
        }
        let x = self.final_norm.forward(&x)?;
        let masks = self
            .mask_estimators
            .iter()
            .map(|estimator| {
                let parts = estimator
                    .iter()
                    .enumerate()
                    .map(|(index, band)| band.forward(&x.narrow(2, index, 1)?.squeeze(2)?))
                    .collect::<Result<Vec<_>>>()?;
                Tensor::cat(&parts, 2)
            })
            .collect::<Result<Vec<_>>>()?;
        let mask = Tensor::stack(&masks, 1)?;
        let stems = mask.dim(1)?;
        let mask = mask
            .reshape((batch, stems, frames, freqs, channels, 2))?
            .permute((0, 1, 4, 3, 2, 5))?;
        let mask_real = mask.narrow(5, 0, 1)?.squeeze(5)?;
        let mask_imag = mask.narrow(5, 1, 1)?.squeeze(5)?;
        let real = real.unsqueeze(1)?;
        let imag = imag.unsqueeze(1)?;
        let out_real = (mask_real.broadcast_mul(&real)? - mask_imag.broadcast_mul(&imag)?)?;
        let out_imag = (mask_real.broadcast_mul(&imag)? + mask_imag.broadcast_mul(&real)?)?;
        Ok((zero_dc(&out_real)?, zero_dc(&out_imag)?))
    }
}

fn zero_dc(spectrum: &Tensor) -> Result<Tensor> {
    let freqs = spectrum.dim(3)?;
    let dc = spectrum.narrow(3, 0, 1)?.zeros_like()?;
    Tensor::cat(&[&dc, &spectrum.narrow(3, 1, freqs - 1)?], 3)
}

#[cfg(test)]
mod tests {
    use super::BsRoformer;
    use crate::entities::bs_roformer::ModelFile;
    use std::collections::HashMap;

    use candle_core::{DType, Device, Tensor};
    use candle_nn::VarBuilder;
    use ndarray::ArrayD;
    use ndarray_npy::NpzReader;

    fn to_tensor(array: &ArrayD<f32>) -> Tensor {
        Tensor::from_slice(array.as_slice().unwrap(), array.shape(), &Device::Cpu).unwrap()
    }

    #[test]
    fn sw_matches_pytorch_reference() {
        let mut npz = NpzReader::new(
            std::fs::File::open(crate::shared::fixtures::fetch(
                &crate::shared::fixtures::REFERENCE,
            ))
            .unwrap(),
        )
        .unwrap();
        let real: ArrayD<f32> = npz.by_name("spec_real").unwrap();
        let imag: ArrayD<f32> = npz.by_name("spec_imag").unwrap();
        let expected_real: ArrayD<f32> = npz.by_name("out_spec_real").unwrap();
        let tensors: HashMap<String, Tensor> = candle_core::pickle::read_all_with_key(
            crate::shared::fixtures::fetch(&crate::shared::fixtures::SW_CHECKPOINT),
            None,
        )
        .unwrap()
        .into_iter()
        .collect();
        let vb = VarBuilder::from_tensors(tensors, DType::F32, &Device::Cpu);
        let text = std::fs::read_to_string(crate::shared::fixtures::fetch(
            &crate::shared::fixtures::SW_CONFIG,
        ))
        .unwrap();
        let config = ModelFile::parse(&text).unwrap().model;
        let model = BsRoformer::new(&config, &vb).unwrap();
        let (out_real, _) = model
            .forward_spectrum(&to_tensor(&real), &to_tensor(&imag))
            .unwrap();
        let expected = to_tensor(&expected_real);
        assert_eq!(out_real.dims(), expected.dims());
        let error = (out_real - &expected)
            .unwrap()
            .abs()
            .unwrap()
            .max_all()
            .unwrap()
            .to_scalar::<f32>()
            .unwrap();
        let scale = expected
            .abs()
            .unwrap()
            .max_all()
            .unwrap()
            .to_scalar::<f32>()
            .unwrap();
        println!("max abs error {error}, reference peak {scale}");
        assert!(error / scale < 1e-3);
    }
}
