// note: カメラ側から光を返す幕に砂漠の景色を映し、人物と同時に撮ったように重ねる。背景はくっきり明るく、人物の輪郭のまわりだけに投影の影の細い縁が残る。
void main() {
  vec3 sky = mix(vec3(1.0, 0.8, 0.55), vec3(0.4, 0.55, 0.85), 1.0 - uv.y * 1.3);
  float dune = 0.55 + 0.06 * sin(uv.x * 5.0) + 0.04 * sin(uv.x * 13.0 + 1.0);
  vec3 sand = mix(vec3(0.95, 0.75, 0.45), vec3(0.75, 0.5, 0.3), smoothstep(dune, dune + 0.3, uv.y) + 0.2 * noise(uv * vec2(30.0, 8.0)));
  vec3 bg = mix(sky, sand, step(dune, uv.y));
  float m = matte(uv);
  float halo = matte(uv + vec2(-0.006, -0.004)) * (1.0 - m);
  bg = mix(bg, bg * 0.35, halo);
  outColor = vec4(mix(bg, rgb(uv), m), 1.0);
}
