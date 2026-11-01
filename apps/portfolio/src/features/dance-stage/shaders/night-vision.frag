// note: 明るさを持ち上げて緑の単色にし、粒子のノイズ、走査線、丸い視野を重ねる。
void main() {
  float l = luma(rgb(uv));
  l = pow(l, 0.6) * 1.2 + (hash(uv * resolution + time) - 0.5) * 0.25;
  vec3 c = vec3(0.15, 1.0, 0.25) * l;
  c *= 0.85 + 0.15 * sin(uv.y * resolution.y * 2.0);
  vec2 d = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
  c *= smoothstep(0.62, 0.55, length(d));
  outColor = vec4(c, 1.0);
}
