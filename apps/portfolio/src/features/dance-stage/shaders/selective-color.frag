// note: 画面を白黒にし、シャツの薄紫の色だけを残す。色が残った所に目が集まる。
void main() {
  vec3 c = rgb(uv);
  float l = luma(c);
  float r = c.r, g = c.g, b = c.b;
  float maxc = max(r, max(g, b));
  float minc = min(r, min(g, b));
  float sat = (maxc - minc) / max(maxc, 0.001);
  float purple = smoothstep(0.03, 0.1, (r + b) * 0.5 - g) * smoothstep(0.06, 0.15, sat);
  vec3 keep = mix(c, c * vec3(1.15, 0.9, 1.25), 0.5);
  outColor = vec4(mix(vec3(l), keep, purple), 1.0);
}
