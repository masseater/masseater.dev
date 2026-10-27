// note: 頭と肩の後ろから、同じ形の波を繰り返す帯を風下へなびかせる。帯は付け根から先へ向かってうねりが流れていく。
void main() {
  vec3 c = rgb(uv);
  vec2 roots[3] = vec2[3](joint(0) + vec2(-0.02, -0.04), joint(11), joint(12));
  vec3 colors[3] = vec3[3](vec3(0.15, 0.1, 0.12), vec3(0.85, 0.2, 0.3), vec3(0.85, 0.2, 0.3));
  for (int i = 0; i < 3; i++) {
    vec2 q = (uv - roots[i]) * vec2(aspect(), 1.0);
    float along = -q.x;
    if (along < 0.0 || along > 0.45) continue;
    float wave = sin(along * 30.0 - time * 8.0) * 0.03 * smoothstep(0.0, 0.1, along);
    float width = 0.02 * (1.0 - along / 0.45);
    float band = smoothstep(width, width * 0.6, abs(q.y - wave - along * 0.15));
    c = mix(c, colors[i], band * (1.0 - matte(uv) * 0.7));
  }
  outColor = vec4(c, 1.0);
}
