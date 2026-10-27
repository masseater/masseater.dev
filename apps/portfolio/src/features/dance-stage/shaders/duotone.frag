// note: 明るさだけを取り出し、暗い所を濃い紺、明るい所をピンクにした 2 色の階調に置き換える。
void main() {
  float l = smoothstep(0.1, 0.95, luma(rgb(uv)));
  vec3 dark = vec3(0.12, 0.08, 0.35);
  vec3 light = vec3(1.0, 0.45, 0.55);
  outColor = vec4(mix(dark, light, l), 1.0);
}
