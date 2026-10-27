// note: 監視カメラの映像のように、白黒にしてコマを 1 秒 8 枚まで間引き、ノイズと走査線、録画の印と時刻を重ねる。
void main() {
  float t = floor(time * 8.0) / 8.0;
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  vec2 p = q * (1.0 + 0.12 * dot(q, q)) / vec2(aspect(), 1.0) + 0.5;
  vec3 c = vec3(luma(pastRgb(p, t)));
  c = c * 0.85 + (hash(uv * resolution + t) - 0.5) * 0.12;
  c *= 0.9 + 0.1 * sin(uv.y * resolution.y * 1.5);
  c *= vec3(0.9, 1.0, 0.92);
  float n = number(uv, vec2(0.62, 0.06), 0.055, 14.0, 2) + number(uv, vec2(0.7, 0.06), 0.055, 32.0 + floor(time / 60.0), 2) + number(uv, vec2(0.78, 0.06), 0.055, floor(mod(time + 17.0, 60.0)), 2);
  c = mix(c, vec3(1.0), clamp(n, 0.0, 1.0));
  c = mix(c, vec3(1.0, 0.1, 0.1), step(dist(uv, vec2(0.06, 0.09)), 0.016) * step(0.5, fract(time)));
  outColor = vec4(c, 1.0);
}
