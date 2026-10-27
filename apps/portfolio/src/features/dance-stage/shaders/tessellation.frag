// note: 六角形の敷き詰めを、辺の位置を時間とともにずらしながら少しずつ別の形へ変えていく。どの形でも隙間なく並び、タイルごとにその場所の踊りの色で塗る。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0) * 10.0;
  vec2 r = vec2(1.0, 1.732);
  vec2 h = r * 0.5;
  vec2 a = mod(q, r) - h;
  vec2 b = mod(q - h, r) - h;
  vec2 g = dot(a, a) < dot(b, b) ? a : b;
  vec2 center = q - g;
  float wobble = 0.15 * sin(time + atan(g.y, g.x) * 3.0);
  vec2 d = abs(g) * (1.0 + wobble);
  float edge = max(d.x * 0.866 + d.y * 0.5, d.y);
  vec3 c = rgb(center / 10.0 / vec2(aspect(), 1.0));
  c = mix(c, vec3(0.1), smoothstep(0.44, 0.48, edge));
  outColor = vec4(c, 1.0);
}
