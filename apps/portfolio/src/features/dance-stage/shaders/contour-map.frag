// note: 人物を山に見立て、明るさと切り抜きから作った高さを 10 段の等高線で切り、段ごとに色を変えた板を積み重ねたように描く。板の縁には影を付ける。
float height(vec2 p) { return clamp(matte(p) * 0.6 + (1.0 - luma(blurRgb(p, 0.008))) * 0.4, 0.0, 0.999); }
void main() {
  float h = height(uv);
  float level = floor(h * 10.0);
  float under = floor(height(uv + vec2(-0.004, -0.007)) * 10.0);
  vec3 low = vec3(0.3, 0.55, 0.35);
  vec3 mid = vec3(0.85, 0.75, 0.45);
  vec3 high = vec3(0.55, 0.35, 0.25);
  vec3 c = level < 5.0 ? mix(low, mid, level / 5.0) : mix(mid, high, (level - 5.0) / 5.0);
  c = mix(vec3(0.35, 0.55, 0.75), c, step(1.0, level));
  c *= 1.0 - 0.35 * step(level + 0.5, under);
  float line = step(0.9, fract(h * 10.0));
  c = mix(c, c * 0.7, line);
  outColor = vec4(c, 1.0);
}
