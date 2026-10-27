// note: 誰もいない部屋を黄緑がかった蛍光灯の色で照らし、踊る人はほとんど消しておく。数秒ごとに人の影が一瞬だけ薄く残り、照明はかすかにうなるように明るさが揺れる。
void main() {
  vec3 c = plate(uv);
  c = mix(c, vec3(luma(c)) * vec3(1.0, 1.02, 0.8), 0.6);
  c *= 0.92 + 0.03 * sin(time * 120.0) + 0.05 * step(0.98, hash(vec2(floor(time * 6.0), 1.0)));
  float trace_ = smoothstep(0.0, 0.3, mod(time, 7.0)) * smoothstep(1.2, 0.3, mod(time, 7.0));
  c = mix(c, rgb(uv) * vec3(0.9, 0.95, 0.85), matte(uv) * trace_ * 0.35);
  c *= 1.0 - 0.35 * length((uv - 0.5) * vec2(1.0, 1.3));
  c += (hash(uv * resolution + floor(time * 24.0)) - 0.5) * 0.03;
  outColor = vec4(c, 1.0);
}
