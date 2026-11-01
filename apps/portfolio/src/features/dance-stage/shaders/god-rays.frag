// note: 踊る人の真後ろ、頭の上あたりに光源を置き、体のすき間から放射状に漏れる光の筋を描く。体が光を遮る所には筋が出ない。
void main() {
  vec2 source = joint(0) + vec2(0.0, -0.05);
  vec3 c = rgb(uv) * 0.6;
  vec2 p = uv;
  vec2 step_ = (uv - source) / 40.0;
  float acc = 0.0;
  float weight = 1.0;
  for (int i = 0; i < 40; i++) {
    p -= step_;
    acc += (1.0 - matte(p)) * weight * (0.5 + 0.5 * step(0.5, fract(atan(p.y - source.y, (p.x - source.x) * aspect()) * 6.0)));
    weight *= 0.96;
  }
  acc /= 20.0;
  c += vec3(1.0, 0.9, 0.7) * acc * 0.6 * (1.0 - matte(uv) * 0.7);
  outColor = vec4(c, 1.0);
}
