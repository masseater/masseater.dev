// note: レコードをこするように、再生位置を前後に素早く揺らす。揺らす強さは数秒ごとに強まったり止んだりする。
void main() {
  float amount = smoothstep(0.3, 0.6, fract(time / 4.0)) * (1.0 - smoothstep(0.85, 1.0, fract(time / 4.0)));
  float t = time + 0.35 * sin(time * 9.0) * amount;
  vec3 c = pastRgb(uv, t);
  c = mix(c, c.gbr, 0.2 * amount * step(0.5, fract(time * 9.0 / PI)));
  outColor = vec4(c, 1.0);
}
