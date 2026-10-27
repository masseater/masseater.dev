// note: 2 拍ごとに攻撃を受けたことにして、踊る人だけを 0.06 秒白く光らせ、その後 0.3 秒かけて赤みを引かせる。背景はそのまま残す。
void main() {
  vec3 c = rgb(uv);
  float m = matte(uv);
  float hit = step(mod(beatCount, 2.0), 0.5);
  float white = step(beat, 0.06) * hit;
  float red = hit * exp(-beat * 8.0) * step(0.06, beat);
  c = mix(c, vec3(1.0), m * white);
  c = mix(c, c * vec3(1.6, 0.5, 0.5), m * red);
  outColor = vec4(c, 1.0);
}
