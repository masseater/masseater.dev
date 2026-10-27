// note: 画面の外から何本ものミサイルが白い煙を引いて飛び込み、踊る人のまわりを渦を巻いて飛び交う。煙の線は曲がりくねり、先頭が小さく光る。
void main() {
  vec3 c = rgb(uv) * 0.85;
  vec2 center = bodyCenter();
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float speed = 0.6 + 0.4 * hash(vec2(fi, 1.0));
    float phase = fract(time * 0.2 * speed + hash(vec2(fi, 2.0)));
    float trail = 9.0;
    vec2 prev = vec2(0.0);
    vec2 head = vec2(0.0);
    for (int k = 0; k < 20; k++) {
      float t = phase - float(k) * 0.012;
      if (t < 0.0) break;
      float radius = mix(0.9, 0.12, t);
      float a = t * 9.0 + fi * 0.7;
      vec2 pos = center + vec2(cos(a) * radius / aspect(), sin(a) * radius * 0.6 + sin(t * 20.0 + fi) * 0.02);
      if (k == 0) head = pos;
      if (k > 0) trail = min(trail, segment(uv, prev, pos));
      prev = pos;
    }
    c = mix(c, vec3(0.96), smoothstep(0.009, 0.004, trail) * 0.85);
    c += vec3(1.0, 0.7, 0.3) * smoothstep(0.012, 0.0, dist(uv, head));
  }
  outColor = vec4(c, 1.0);
}
