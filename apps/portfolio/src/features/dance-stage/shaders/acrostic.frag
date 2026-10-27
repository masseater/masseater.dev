// note: 3 行の詩の頭の字を縦に読むと「おどる」になる折句を、踊りの横に並べる。頭の字だけを赤く大きく光らせ、拍に合わせて 1 行ずつ強調する。
// text: お　もいきり　うでを　あげて
// text: ど　こまでも　ひざを　まげて
// text: る　んるんと　まわって　とまる
void main() {
  vec3 c = mix(vec3(0.98, 0.96, 0.9), rgb(uv), step(0.5, uv.x));
  for (int row = 0; row < 3; row++) {
    vec2 center = vec2(0.25, 0.3 + float(row) * 0.2);
    float h = 0.07;
    float t = textBox(uv, center, h, row);
    float width = h * textAspect(row) / aspect();
    float first = step(uv.x, center.x - width * 0.5 + h / aspect() * 1.1);
    float now = step(abs(mod(beatCount, 3.0) - float(row)), 0.1);
    vec3 ink = mix(vec3(0.2), mix(vec3(0.85, 0.1, 0.15), vec3(1.0, 0.2, 0.25), now), first);
    c = mix(c, ink, t);
  }
  outColor = vec4(c, 1.0);
}
