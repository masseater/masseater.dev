use anyhow::{Context, Result, ensure};
use fast_image_resize as fr;
use image::{GrayImage, RgbImage};

pub(crate) const BLOCKS_X: u32 = 4;
pub(crate) const BLOCKS_Y: u32 = 3;
pub(crate) const BLOCKS: usize = (BLOCKS_X * BLOCKS_Y) as usize;
pub(crate) const CHANNELS: usize = 3;
pub(crate) const FEATURES: usize = BLOCKS * CHANNELS;
pub(crate) const TILE_ASPECT: (u32, u32) = (16, 9);

const TO_LMS: [[f64; 3]; 3] = [
    [0.412_221_470_8, 0.536_332_536_3, 0.051_445_992_9],
    [0.211_903_498_2, 0.680_699_545_1, 0.107_396_956_6],
    [0.088_302_461_9, 0.281_718_837_6, 0.629_978_700_5],
];
const TO_LAB: [[f64; 3]; 3] = [
    [0.210_454_255_3, 0.793_617_785_0, -0.004_072_046_8],
    [1.977_998_495_1, -2.428_592_205_0, 0.450_593_709_9],
    [0.025_904_037_1, 0.782_771_766_2, -0.808_675_766_0],
];

#[derive(Clone, Copy)]
pub(crate) enum Filter {
    Box,
    Lanczos,
}

fn dot(matrix: &[[f64; 3]; 3], vector: [f64; 3]) -> [f64; 3] {
    matrix.map(|row| row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2])
}

pub(crate) fn oklab(rgb: [u8; 3]) -> [f64; 3] {
    let linear = rgb.map(|value| {
        let c = f64::from(value) / 255.0;
        if c <= 0.04045 {
            c / 12.92
        } else {
            ((c + 0.055) / 1.055).powf(2.4)
        }
    });
    dot(&TO_LAB, dot(&TO_LMS, linear).map(f64::cbrt))
}

fn resize_raw(
    data: &[u8],
    from: (u32, u32),
    to: (u32, u32),
    pixel: fr::PixelType,
    filter: Filter,
) -> Result<Vec<u8>> {
    ensure!(to.0 > 0 && to.1 > 0, "縮小先の大きさが 0 になった: {to:?}");
    let source = fr::images::ImageRef::new(from.0, from.1, data, pixel)?;
    let mut target = fr::images::Image::new(to.0, to.1, pixel);
    let algorithm = fr::ResizeAlg::Convolution(match filter {
        Filter::Box => fr::FilterType::Box,
        Filter::Lanczos => fr::FilterType::Lanczos3,
    });
    fr::Resizer::new().resize(
        &source,
        &mut target,
        &fr::ResizeOptions::new().resize_alg(algorithm),
    )?;
    Ok(target.into_vec())
}

pub(crate) fn resize_rgb(image: &RgbImage, to: (u32, u32), filter: Filter) -> Result<RgbImage> {
    let data = resize_raw(
        image.as_raw(),
        image.dimensions(),
        to,
        fr::PixelType::U8x3,
        filter,
    )?;
    RgbImage::from_raw(to.0, to.1, data).context("縮小した画像の大きさが合わない")
}

pub(crate) fn resize_gray(image: &GrayImage, to: (u32, u32), filter: Filter) -> Result<GrayImage> {
    let data = resize_raw(
        image.as_raw(),
        image.dimensions(),
        to,
        fr::PixelType::U8,
        filter,
    )?;
    GrayImage::from_raw(to.0, to.1, data).context("縮小した画像の大きさが合わない")
}

pub(crate) fn crop_to_tile(image: &RgbImage) -> RgbImage {
    let (width, height) = image.dimensions();
    let (aspect_width, aspect_height) = TILE_ASPECT;
    if width * aspect_height > height * aspect_width {
        let cropped = height * aspect_width / aspect_height;
        image::imageops::crop_imm(image, (width - cropped) / 2, 0, cropped, height).to_image()
    } else {
        let cropped = width * aspect_height / aspect_width;
        image::imageops::crop_imm(image, 0, (height - cropped) / 2, width, cropped).to_image()
    }
}

pub(crate) fn features(image: &RgbImage) -> Result<[f32; FEATURES]> {
    let blocks = resize_rgb(image, (BLOCKS_X, BLOCKS_Y), Filter::Box)?;
    let mut found = [0.0; FEATURES];
    for (block, pixel) in blocks.pixels().enumerate() {
        for (channel, value) in oklab(pixel.0).into_iter().enumerate() {
            found[block * CHANNELS + channel] = value as f32;
        }
    }
    Ok(found)
}

fn luma(rgb: [u8; 3]) -> u8 {
    let [red, green, blue] = rgb.map(u32::from);
    ((red * 19595 + green * 38470 + blue * 7471 + 0x8000) >> 16) as u8
}

pub(crate) fn dhash(image: &RgbImage) -> Result<[u8; 8]> {
    let gray = GrayImage::from_fn(image.width(), image.height(), |x, y| {
        image::Luma([luma(image.get_pixel(x, y).0)])
    });
    let small = resize_gray(&gray, (9, 8), Filter::Box)?;
    let mut hash = [0; 8];
    for (y, byte) in hash.iter_mut().enumerate() {
        for x in 0..8 {
            let brighter =
                small.get_pixel(x + 1, y as u32).0[0] > small.get_pixel(x, y as u32).0[0];
            *byte = (*byte << 1) | u8::from(brighter);
        }
    }
    Ok(hash)
}

pub(crate) fn decode_rgb(raw: &[u8]) -> Result<RgbImage> {
    Ok(image::load_from_memory(raw)?.to_rgb8())
}

pub(crate) fn encode_jpeg(image: &RgbImage, quality: u8, progressive: bool) -> Result<Vec<u8>> {
    let mut encoded = Vec::new();
    let mut encoder = jpeg_encoder::Encoder::new(&mut encoded, quality);
    encoder.set_sampling_factor(jpeg_encoder::SamplingFactor::R_4_2_0);
    encoder.set_progressive(progressive);
    encoder.set_optimized_huffman_tables(progressive);
    encoder.encode(
        image.as_raw(),
        u16::try_from(image.width())?,
        u16::try_from(image.height())?,
        jpeg_encoder::ColorType::Rgb,
    )?;
    Ok(encoded)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn close(left: [f64; 3], right: [f64; 3]) -> bool {
        left.iter().zip(right).all(|(a, b)| (a - b).abs() < 1e-3)
    }

    #[test]
    fn oklab_maps_white_black_and_red_to_their_reference_values() {
        assert!(close(oklab([255, 255, 255]), [1.0, 0.0, 0.0]));
        assert!(close(oklab([0, 0, 0]), [0.0, 0.0, 0.0]));
        assert!(close(oklab([255, 0, 0]), [0.627_955, 0.224_863, 0.125_846]));
    }

    #[test]
    fn crop_to_tile_keeps_the_centre_at_sixteen_to_nine() {
        let wide = RgbImage::from_fn(400, 90, |x, _| image::Rgb([(x / 2) as u8, 0, 0]));
        let cropped = crop_to_tile(&wide);
        assert_eq!(cropped.dimensions(), (160, 90));
        assert_eq!(cropped.get_pixel(0, 0).0[0], 60);
        let tall = RgbImage::new(160, 200);
        assert_eq!(crop_to_tile(&tall).dimensions(), (160, 90));
    }

    #[test]
    fn features_average_each_block_in_row_order() {
        let image = RgbImage::from_fn(40, 30, |x, y| {
            if x < 10 && y < 10 {
                image::Rgb([255, 255, 255])
            } else {
                image::Rgb([0, 0, 0])
            }
        });
        let found = features(&image).unwrap();
        assert!((found[0] - 1.0).abs() < 1e-3);
        assert!(found[CHANNELS..].iter().all(|value| value.abs() < 1e-3));
    }

    #[test]
    fn dhash_sets_a_bit_where_the_right_neighbour_is_brighter() {
        let rising = RgbImage::from_fn(90, 80, |x, _| image::Rgb([(x * 2) as u8; 3]));
        assert_eq!(dhash(&rising).unwrap(), [0xff; 8]);
        let falling = RgbImage::from_fn(90, 80, |x, _| image::Rgb([(180 - x * 2) as u8; 3]));
        assert_eq!(dhash(&falling).unwrap(), [0; 8]);
    }
}
