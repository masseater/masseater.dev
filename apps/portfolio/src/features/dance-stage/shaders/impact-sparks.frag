// note: 拍のたびに右の手首が何かを打ったことにして、その場所から橙の火花と灰色の破片を放射状に散らし、重力で落とす。
void main() {
  vec3 c = rgb(uv);
  vec2 origin = joint(16);
  float t = beat;
  for (int i = 0; i < 24; i++) {
    vec2 seed = vec2(float(i), floor(beatCount));
    float a = hash(seed) * 2.0 * PI;
    float speed = 0.3 + 0.6 * hash(seed + 1.0);
    vec2 v = vec2(cos(a) / aspect(), sin(a)) * speed;
    vec2 p = origin + v * t + vec2(0.0, 1.2) * t * t;
    vec2 tail = origin + v * max(t - 0.03, 0.0) + vec2(0.0, 1.2) * max(t - 0.03, 0.0) * max(t - 0.03, 0.0);
    float spark = smoothstep(0.004, 0.0, segment(uv, p, tail)) * exp(-t * 4.0);
    c += vec3(1.0, 0.6, 0.2) * spark * 1.5;
    if (i < 8) {
      vec2 q = rot((uv - p * 0.6 - origin * 0.4) * vec2(aspect(), 1.0), t * 10.0 + float(i));
      c = mix(c, vec3(0.4), step(abs(q.x), 0.008) * step(abs(q.y), 0.005) * step(t, 0.8));
    }
  }
  c += vec3(1.0, 0.8, 0.4) * exp(-dist(uv, origin) * 20.0) * exp(-t * 12.0);
  outColor = vec4(c, 1.0);
}
