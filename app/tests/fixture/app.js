// TODO: refactor all of this before launch
const WEATHER_KEY = "AIzaSyD4fakefixture1234567890abcdefghi";
console.log("boot");
console.log("state", window.state);
console.log("debug 3");
console.log("debug 4");
function render(html) {
  document.getElementById("root").innerHTML = html;
}
function run(code) {
  eval(code);
}
// FIXME: streak logic is wrong across midnight
console.log("ready");
