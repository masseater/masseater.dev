// note: 色のにじみ、走査線、上下に流れるトラッキングの乱れ、テープのノイズを重ねる。
void main() {
  float wobble = (noise(vec2(uv.y * 40.0, time * 2.0)) - 0.5) * 0.004;
  float band = smoothstep(0.0, 0.04, abs(uv.y - fract(time * 0.15)));
  float tear = (1.0 - band) * (hash(vec2(floor(uv.y * 200.0), time)) - 0.5) * 0.05;
  vec2 p = uv + vec2(wobble + tear, 0.0);
  float y = luma(rgb(p));
  vec3 chroma = rgb(p - vec2(0.008, 0.0)) - luma(rgb(p - vec2(0.008, 0.0)));
  vec3 c = y + chroma * 1.3;
  c *= 0.9 + 0.1 * sin(uv.y * resolution.y * 1.5);
  c += (hash(uv * resolution + time) - 0.5) * 0.12;
  c = mix(c, vec3(0.9), (1.0 - band) * 0.25);
  outColor = vec4(c * vec3(1.02, 0.97, 1.05), 1.0);
}
