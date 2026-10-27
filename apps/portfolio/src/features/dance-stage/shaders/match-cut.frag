// note: 2 拍ごとに、踊る本人と、同じ形の影を夕焼けの丘に置いた画とを切り替える。形と位置が同じなので、別の場面なのにつながって見える。
void main() {
  float shot = mod(floor(beatCount / 2.0), 2.0);
  vec3 c = rgb(uv);
  if (shot > 0.5) {
    vec3 sky = mix(vec3(1.0, 0.55, 0.25), vec3(0.35, 0.2, 0.45), uv.y * 0.2 + (1.0 - uv.y) * 0.9);
    float hill = step(0.88 + 0.04 * sin(uv.x * 5.0), uv.y);
    sky = mix(sky, vec3(0.08, 0.05, 0.1), hill);
    sky += vec3(1.0, 0.85, 0.5) * exp(-dist(uv, vec2(0.75, 0.55)) * 8.0);
    c = mix(sky, vec3(0.04, 0.02, 0.06), matte(uv));
  }
  outColor = vec4(c, 1.0);
}
