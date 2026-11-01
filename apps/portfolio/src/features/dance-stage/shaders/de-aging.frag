// note: 顔のまわりの肌だけを細かいむらが消えるまでならし、少し明るく血色よくして若く見せる。左右に動く境目の右側だけに処理をかけ、前と後を見比べられるようにする。
void main() {
  vec3 c = rgb(uv);
  float split = 0.5 + 0.25 * sin(time * 0.6);
  float region = smoothstep(0.11, 0.07, dist(uv, joint(0))) * matte(uv) * step(split, uv.x);
  vec3 smooth_ = blurRgb(uv, 0.006);
  vec3 young = mix(c, smooth_, 0.8) * vec3(1.08, 1.03, 1.0) + vec3(0.03, 0.01, 0.0);
  c = mix(c, young, region);
  c = mix(c, vec3(1.0), step(abs(uv.x - split), 0.0015) * 0.8);
  outColor = vec4(c, 1.0);
}
