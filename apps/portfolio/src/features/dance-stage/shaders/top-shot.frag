// note: 骨格の推定が出す奥行きを使い、関節を真上から見た位置に並べ直す。右の小窓が元の映像で、左が床を見下ろした図になる。
void main() {
  vec3 c = vec3(0.12, 0.13, 0.16);
  vec2 g = fract(uv * vec2(16.0, 9.0));
  c += 0.04 * (step(g.x, 0.03) + step(g.y, 0.05));
  vec2 center = vec2(0.38, 0.5);
  for (int i = 11; i < 33; i++) {
    vec2 top = center + vec2((pose[i].x - 0.5) * 0.7, pose[i].z * 0.35);
    float d = dist(uv, top);
    vec3 tint = i < 23 ? vec3(1.0, 0.6, 0.3) : vec3(0.3, 0.8, 1.0);
    c = mix(c, tint, smoothstep(0.022, 0.012, d) * step(0.3, pose[i].w));
  }
  vec2 head = center + vec2((pose[0].x - 0.5) * 0.7, pose[0].z * 0.35);
  c = mix(c, vec3(1.0), smoothstep(0.05, 0.04, dist(uv, head)));
  vec2 inset = (uv - vec2(0.7, 0.62)) / 0.28;
  if (inset.x > 0.0 && inset.x < 1.0 && inset.y > 0.0 && inset.y < 1.0) c = rgb(inset);
  outColor = vec4(c, 1.0);
}
