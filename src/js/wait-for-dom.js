export default function waitForDom(func) {
  if (document.readyState === 'complete') {
    func();
  } else {
    document.addEventListener('readystatechange', function () {
      if (document.readyState === 'complete') {
        func();
      }
    });
  }
}
