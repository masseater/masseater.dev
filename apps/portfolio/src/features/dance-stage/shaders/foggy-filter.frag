// note: 霧の中で撮ったように、全体を白くかすませ、暗い所を持ち上げて明暗の差を弱める。明るい所はわずかににじませる。
void main() {
  vec3 c = rgb(uv);
  vec3 soft = blurRgb(uv, 0.01);
  c = mix(c, soft, 0.35);
  c = c * 0.7 + 0.25;
  outColor = vec4(c, 1.0);
}
