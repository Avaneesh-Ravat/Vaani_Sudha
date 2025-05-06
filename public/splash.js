const form = document.getElementById("registerForm");
    const splash = document.getElementById("splashScreen");
    const video = document.getElementById("splashVideo");

    let skip = false;

    form.addEventListener("submit", function (e) {
      e.preventDefault(); // Stop immediate submission

      splash.style.display = "flex"; // Show splash screen

      setTimeout(() => {
        if (!skip) form.submit(); // Submit after 4s if not skipped
      }, 4000);
    });

    function skipSplash() {
      skip = true;
      splash.style.display = "none";
      form.submit(); // Submit immediately
    }