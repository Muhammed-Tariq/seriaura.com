/* Shared footer for the main site and its standalone information pages. */
(() => {
  const root = new URL('.', document.currentScript.src);
  const local = path => new URL(path, root).href;
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="footer-top">
      <div class="footer-identity">
        <a class="brand footer-brand" href="${local('index.html#home')}" aria-label="Seriaura — Home">
          <span class="brand-crop"><img class="logo logo-white" src="${local('assets/logo.png')}" alt="セリアウラ" width="2000" height="2000"><img class="logo logo-orange" src="${local('assets/logo-orange.png')}" alt="" aria-hidden="true" width="2000" height="2000"></span>
        </a>
      </div>
      <div class="footer-connect">
        <div class="social-hub">
          <div class="social-links" id="footer-social-links" role="group" aria-label="Find me elsewhere"></div>
          <span class="social-page-status" role="status" aria-live="polite" aria-atomic="true"></span>
        </div>
      </div>
    </div>
    <div class="footer-bottom"><small>© ${new Date().getFullYear()} Seriaura. All rights reserved.</small><a class="footer-credits" href="${local('credits/')}">Credits</a></div>
    <div class="copy-status" role="status" aria-live="polite" aria-atomic="true"></div>`;
  // social-art:start
  // Local icon geometry; regenerated with node tools/build-social-icons.cjs.
  const socialIconArt = {
  "envelope": "<svg class=\"social-icon\" data-social-icon=\"envelope\" viewBox=\"0 0 512 512\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece mail-body\" d=\"M0 196L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-188-198.4 148.8c-34.1 25.6-81.1 25.6-115.2 0L0 196z\"/><path class=\"social-piece mail-flap\" d=\"M48 64c-26.5 0-48 21.5-48 48 0 15.1 7.1 29.3 19.2 38.4l208 156c17.1 12.8 40.5 12.8 57.6 0l208-156c12.1-9.1 19.2-23.3 19.2-38.4 0-26.5-21.5-48-48-48L48 64z\"/></svg>",
  "linkedin-in": "<svg class=\"social-icon\" data-social-icon=\"linkedin-in\" viewBox=\"0 0 448 512\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece linkedin-stem\" d=\"M100.3 448l-92.9 0 0-299.1 92.9 0 0 299.1z\"/><path class=\"social-piece linkedin-dot\" d=\"M53.8 108.1C24.1 108.1 0 83.5 0 53.8 0 39.5 5.7 25.9 15.8 15.8s23.8-15.8 38-15.8 27.9 5.7 38 15.8 15.8 23.8 15.8 38c0 29.7-24.1 54.3-53.8 54.3z\"/><path class=\"social-piece linkedin-n\" d=\"M447.9 448l-92.7 0 0-145.6c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7l0 148.1-92.8 0 0-299.1 89.1 0 0 40.8 1.3 0c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3l0 164.3-.1 0z\"/></svg>",
  "globe": "<svg class=\"social-icon\" data-social-icon=\"globe\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10.7\"/><path class=\"globe-back\" opacity=\".18\"/><path class=\"globe-front\"/></g></svg>",
  "substack": "<svg class=\"social-icon\" data-social-icon=\"substack\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece stack-middle\" d=\"M22.539 8.242H1.46V5.406h21.08v2.836z\"/><path class=\"social-piece stack-page\" d=\"M1.46 10.812V24L12 18.11 22.54 24V10.812H1.46z\"/><path class=\"social-piece stack-top\" d=\"M22.54 0H1.46v2.836h21.08V0z\"/></svg>",
  "x": "<svg class=\"social-icon\" data-social-icon=\"x\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><defs><mask id=\"social-x-bird\" maskUnits=\"userSpaceOnUse\" x=\"-24\" y=\"-24\" width=\"72\" height=\"72\" style=\"mask-type:alpha\"><g class=\"social-piece x-bird-shape\"><path transform=\"translate(1.2 1.2) scale(.0421875)\" d=\"M459.4 151.7c.3 4.5 .3 9.1 .3 13.6 0 138.7-105.6 298.6-298.6 298.6-59.5 0-114.7-17.2-161.1-47.1 8.4 1 16.6 1.3 25.3 1.3 49.1 0 94.2-16.6 130.3-44.8-46.1-1-84.8-31.2-98.1-72.8 6.5 1 13 1.6 19.8 1.6 9.4 0 18.8-1.3 27.6-3.6-48.1-9.7-84.1-52-84.1-103l0-1.3c14 7.8 30.2 12.7 47.4 13.3-28.3-18.8-46.8-51-46.8-87.4 0-19.5 5.2-37.4 14.3-53 51.7 63.7 129.3 105.3 216.4 109.8-1.6-7.8-2.6-15.9-2.6-24 0-57.8 46.8-104.9 104.9-104.9 30.2 0 57.5 12.7 76.7 33.1 23.7-4.5 46.5-13.3 66.6-25.3-7.8 24.4-24.4 44.8-46.1 57.8 21.1-2.3 41.6-8.1 60.4-16.2-14.3 20.8-32.2 39.3-52.6 54.3z\"/></g></mask></defs><g class=\"social-piece x-bird\"><g class=\"social-piece x-bird-shape\"><path transform=\"translate(1.2 1.2) scale(.0421875)\" d=\"M459.4 151.7c.3 4.5 .3 9.1 .3 13.6 0 138.7-105.6 298.6-298.6 298.6-59.5 0-114.7-17.2-161.1-47.1 8.4 1 16.6 1.3 25.3 1.3 49.1 0 94.2-16.6 130.3-44.8-46.1-1-84.8-31.2-98.1-72.8 6.5 1 13 1.6 19.8 1.6 9.4 0 18.8-1.3 27.6-3.6-48.1-9.7-84.1-52-84.1-103l0-1.3c14 7.8 30.2 12.7 47.4 13.3-28.3-18.8-46.8-51-46.8-87.4 0-19.5 5.2-37.4 14.3-53 51.7 63.7 129.3 105.3 216.4 109.8-1.6-7.8-2.6-15.9-2.6-24 0-57.8 46.8-104.9 104.9-104.9 30.2 0 57.5 12.7 76.7 33.1 23.7-4.5 46.5-13.3 66.6-25.3-7.8 24.4-24.4 44.8-46.1 57.8 21.1-2.3 41.6-8.1 60.4-16.2-14.3 20.8-32.2 39.3-52.6 54.3z\"/></g></g><g class=\"social-piece x-thin\"><path class=\"social-piece x-spear\" d=\"M20.905 0H22.977L2.33 24H.258z\" stroke=\"currentColor\"/></g><g class=\"social-piece x-pierce\"><g mask=\"url(#social-x-bird)\"><g class=\"social-piece x-thin\"><path class=\"social-piece x-spear social-cutout social-cutout-stroke\" d=\"M20.905 0H22.977L2.33 24H.258z\"/></g></g></g><g class=\"social-piece x-bold\"><path class=\"social-cutout\" d=\"M.258 0H7.251L23.742 24H16.749z\"/><path fill-rule=\"evenodd\" d=\"M.258 0H7.251L23.742 24H16.749zM11.397 13.461l-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z\"/></g></svg>",
  "instagram": "<svg class=\"social-icon\" data-social-icon=\"instagram\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"1.2\" y=\"1.2\" width=\"21.6\" height=\"21.6\" rx=\"6.1\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\"/><g class=\"social-piece camera-lens\"><circle cx=\"12\" cy=\"12\" r=\"5.1\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\"/></g><circle class=\"social-piece camera-flash\" cx=\"18.3\" cy=\"5.7\" r=\"1.4\"/></svg>",
  "discord": "<svg class=\"social-icon\" data-social-icon=\"discord\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece discord-body\" d=\"M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z\"/><g class=\"social-piece discord-eyes\"><ellipse class=\"social-cutout\" cx=\"8.02\" cy=\"12.91\" rx=\"2.16\" ry=\"2.42\"/><ellipse class=\"social-cutout\" cx=\"15.99\" cy=\"12.91\" rx=\"2.16\" ry=\"2.42\"/></g></svg>",
  "strava": "<svg class=\"social-icon\" data-social-icon=\"strava\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece strava-summit\" d=\"M10.463 8.229l2.836 5.598h4.172L10.463 0l-7 13.828h4.169z\"/><path class=\"social-piece strava-trail\" d=\"M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066z\"/></svg>",
  "goodreads": "<svg class=\"social-icon\" data-social-icon=\"goodreads\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece goodreads-letter\" d=\"M17.346.026c.422-.083.859.037 1.179.325.346.284.55.705.557 1.153-.023.457-.247.88-.612 1.156l-2.182 1.748a.601.601 0 0 0-.255.43.52.52 0 0 0 .11.424 5.886 5.886 0 0 1 .832 6.58c-1.394 2.79-4.503 3.99-7.501 2.927a.792.792 0 0 0-.499-.01c-.224.07-.303.18-.453.383l-.014.02-.941 1.254s-.792.985.457.935c3.027-.119 3.817-.119 5.439-.01 2.641.18 3.806 1.903 3.806 3.275 0 1.623-1.036 3.383-3.809 3.383a117.46 117.46 0 0 0-5.517-.03c-.31.005-.597.013-.835.02-.228.006-.41.011-.52.011-.712 0-1.648-.186-1.66-1.068-.008-.729.624-1.12 1.11-1.172.43-.045.815.007 1.24.064.252.034.518.07.815.088.185.011.366.025.552.038.53.038 1.102.08 1.926.087.427.005.759.01 1.025.015.695.012.941.016 1.28-.015 1.248-.112 1.832-.61 1.832-1.376 0-.805-.584-1.264-1.698-1.414-1.564-.213-2.33-.163-3.72-.074a87.66 87.66 0 0 1-1.669.095c-.608.029-2.449.026-2.682-1.492-.053-.416-.073-1.116.807-2.325l.75-1.003c.36-.49.582-.898.053-1.559 0 0-.39-.468-.52-.638-1.215-1.587-1.512-4.08-.448-6.114 1.577-3.011 5.4-4.26 8.37-2.581.253.143.438.203.655.163.201-.032.27-.167.363-.344.02-.04.042-.082.067-.126.004-.01.241-.465.535-1.028l.734-1.41a1.493 1.493 0 0 1 1.041-.785ZM9.193 13.243c1.854.903 3.912.208 5.254-2.47 1.352-2.699.827-5.11-1.041-6.023C10.918 3.537 8.81 5.831 8.017 7.41c-1.355 2.698-.717 4.886 1.147 5.818Z\"/></svg>",
  "snapchat": "<svg class=\"social-icon\" data-social-icon=\"snapchat\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"snapchat-shape\" d=\"M12.206 0.793 C13.196 0.793 16.553 1.069 18.136 4.614 C18.665 5.807 18.539 7.833 18.435 9.461 L18.432 9.521 C18.420 9.701 18.410 9.866 18.402 10.031 C18.477 10.076 18.605 10.121 18.803 10.121 C19.103 10.105 19.462 10.001 19.836 9.820 C20.001 9.732 20.180 9.716 20.300 9.716 C20.482 9.716 20.659 9.745 20.809 9.806 C21.259 9.955 21.543 10.285 21.543 10.644 C21.558 11.093 21.153 11.483 20.330 11.812 C20.241 11.841 20.121 11.887 19.986 11.931 C19.536 12.066 18.847 12.291 18.653 12.741 C18.563 12.965 18.592 13.265 18.773 13.609 L18.788 13.624 C18.848 13.760 20.314 17.099 23.579 17.638 C23.834 17.682 24.014 17.908 23.999 18.147 C23.999 18.222 23.984 18.296 23.954 18.372 C23.714 18.941 22.681 19.360 20.808 19.643 C20.749 19.734 20.688 20.018 20.644 20.213 C20.615 20.392 20.570 20.573 20.510 20.766 C20.434 21.037 20.240 21.171 19.955 21.171 L19.925 21.171 C19.790 21.171 19.612 21.140 19.387 21.097 C19.027 21.022 18.622 20.962 18.114 20.962 C17.814 20.962 17.515 20.977 17.201 21.036 C16.601 21.140 16.078 21.500 15.478 21.920 C14.625 22.519 13.652 23.208 12.184 23.208 C12.124 23.208 12.065 23.193 12.004 23.193 L11.855 23.193 C10.387 23.193 9.428 22.518 8.576 21.905 C7.977 21.485 7.469 21.126 6.869 21.021 C6.555 20.976 6.240 20.947 5.941 20.947 C5.401 20.947 4.983 21.036 4.669 21.096 C4.458 21.139 4.278 21.170 4.129 21.170 C3.755 21.170 3.606 20.946 3.546 20.750 C3.485 20.558 3.456 20.361 3.411 20.183 C3.365 20.002 3.306 19.689 3.245 19.613 C1.327 19.391 0.295 18.971 0.056 18.387 C0.025 18.324 0.004 18.237 0.001 18.162 C-0.014 17.919 0.166 17.697 0.421 17.653 C3.685 17.113 5.151 13.774 5.212 13.633 L5.228 13.604 C5.408 13.259 5.452 12.959 5.347 12.735 C5.152 12.301 4.463 12.077 4.015 11.926 C3.894 11.897 3.775 11.852 3.669 11.807 C2.562 11.372 2.412 10.877 2.472 10.534 C2.562 10.055 3.146 9.741 3.640 9.741 C3.786 9.741 3.910 9.770 4.023 9.815 C4.443 10.009 4.812 10.115 5.127 10.115 C5.361 10.115 5.511 10.055 5.592 10.010 L5.546 9.441 C5.448 7.815 5.321 5.790 5.853 4.604 C7.392 1.077 10.739 0.807 11.727 0.807 L12.146 0.792 L12.206 0.792 Z\" data-morph-a=\"M12.206 0.793 C13.196 0.793 16.553 1.069 18.136 4.614 C18.665 5.807 18.539 7.833 18.435 9.463 L18.433 9.523 C18.421 9.705 18.413 9.871 18.407 10.038 C18.482 10.084 18.611 10.130 18.809 10.130 C19.109 10.115 19.466 10.009 19.838 9.825 C20.003 9.736 20.182 9.720 20.302 9.720 C20.484 9.720 20.661 9.749 20.811 9.811 C21.263 9.961 21.552 10.294 21.561 10.659 C21.593 11.117 21.209 11.521 20.409 11.867 C20.322 11.898 20.206 11.946 20.074 11.993 C19.636 12.134 18.967 12.364 18.821 12.830 C18.757 13.063 18.825 13.377 19.053 13.740 L19.070 13.756 C19.150 13.900 21.098 17.426 24.406 17.635 C24.664 17.642 24.855 17.839 24.849 18.078 C24.850 18.152 24.837 18.228 24.807 18.308 C24.559 18.914 23.503 19.518 21.606 20.062 C21.537 20.162 21.443 20.461 21.372 20.667 C21.316 20.854 21.241 21.044 21.146 21.247 C21.017 21.531 20.795 21.680 20.510 21.691 L20.480 21.692 C20.345 21.694 20.173 21.663 19.957 21.617 C19.613 21.527 19.220 21.438 18.712 21.387 C18.412 21.349 18.110 21.320 17.784 21.329 C17.162 21.323 16.558 21.579 15.855 21.870 C14.841 22.289 13.673 22.805 12.205 22.665 C12.145 22.663 12.090 22.647 12.029 22.645 L11.880 22.643 C10.412 22.726 9.644 22.195 8.957 21.751 C8.461 21.459 8.033 21.206 7.455 21.221 C7.150 21.234 6.841 21.259 6.542 21.306 C6.002 21.378 5.566 21.511 5.240 21.595 C5.019 21.651 4.833 21.689 4.684 21.693 C4.310 21.693 4.207 21.460 4.185 21.256 C4.159 21.056 4.162 20.851 4.144 20.665 C4.122 20.475 4.099 20.147 4.045 20.065 C2.146 19.623 1.139 19.023 0.910 18.396 C0.878 18.328 0.856 18.238 0.851 18.162 C0.828 17.917 0.997 17.722 1.249 17.715 C4.470 17.451 5.455 13.905 5.496 13.756 L5.507 13.725 C5.640 13.360 5.646 13.047 5.514 12.816 C5.273 12.369 4.564 12.143 4.103 11.988 C3.980 11.958 3.857 11.911 3.748 11.864 C2.612 11.408 2.438 10.899 2.486 10.549 C2.567 10.063 3.148 9.745 3.642 9.745 C3.788 9.745 3.912 9.775 4.025 9.820 C4.447 10.017 4.818 10.124 5.133 10.124 C5.367 10.123 5.516 10.062 5.596 10.016 L5.546 9.442 C5.448 7.815 5.321 5.790 5.853 4.604 C7.392 1.077 10.739 0.807 11.727 0.807 L12.146 0.792 L12.206 0.792 Z\" data-morph-b=\"M12.206 0.793 C13.196 0.793 16.553 1.069 18.136 4.614 C18.665 5.807 18.539 7.833 18.435 9.459 L18.431 9.519 C18.419 9.697 18.407 9.861 18.397 10.024 C18.472 10.068 18.599 10.112 18.797 10.112 C19.097 10.095 19.458 9.993 19.834 9.815 C19.999 9.728 20.178 9.712 20.298 9.712 C20.480 9.712 20.657 9.741 20.807 9.801 C21.255 9.949 21.534 10.276 21.525 10.629 C21.523 11.069 21.097 11.445 20.251 11.757 C20.160 11.784 20.036 11.828 19.898 11.869 C19.436 11.998 18.727 12.218 18.485 12.652 C18.369 12.867 18.359 13.153 18.493 13.478 L18.506 13.492 C18.546 13.620 19.530 16.772 22.752 17.641 C23.004 17.722 23.173 17.977 23.149 18.216 C23.148 18.292 23.131 18.364 23.101 18.436 C22.869 18.968 21.859 19.202 20.010 19.224 C19.961 19.306 19.933 19.575 19.916 19.759 C19.914 19.930 19.899 20.102 19.874 20.285 C19.851 20.543 19.685 20.662 19.400 20.651 L19.370 20.650 C19.235 20.648 19.051 20.617 18.817 20.577 C18.441 20.517 18.024 20.486 17.516 20.537 C17.216 20.575 16.920 20.634 16.618 20.743 C16.040 20.957 15.598 21.421 15.101 21.970 C14.409 22.749 13.631 23.611 12.163 23.751 C12.103 23.753 12.040 23.739 11.979 23.741 L11.830 23.743 C10.362 23.660 9.212 22.841 8.195 22.059 C7.493 21.511 6.905 21.046 6.283 20.821 C5.960 20.718 5.639 20.635 5.340 20.588 C4.800 20.516 4.400 20.561 4.098 20.597 C3.897 20.627 3.723 20.651 3.574 20.647 C3.200 20.647 3.005 20.432 2.907 20.244 C2.811 20.060 2.750 19.871 2.678 19.701 C2.608 19.529 2.513 19.231 2.445 19.161 C0.508 19.159 -0.549 18.919 -0.798 18.378 C-0.828 18.320 -0.848 18.236 -0.849 18.162 C-0.856 17.921 -0.665 17.672 -0.407 17.591 C2.900 16.775 4.847 13.643 4.928 13.510 L4.949 13.483 C5.176 13.158 5.258 12.871 5.180 12.654 C5.031 12.233 4.362 12.011 3.927 11.864 C3.808 11.836 3.693 11.793 3.590 11.750 C2.512 11.336 2.386 10.855 2.458 10.519 C2.557 10.047 3.144 9.737 3.638 9.737 C3.784 9.737 3.908 9.765 4.021 9.810 C4.439 10.001 4.806 10.106 5.121 10.106 C5.355 10.107 5.506 10.048 5.588 10.004 L5.546 9.440 C5.448 7.815 5.321 5.790 5.853 4.604 C7.392 1.077 10.739 0.807 11.727 0.807 L12.146 0.792 L12.206 0.792 Z\"/></svg>",
  "youtube": "<svg class=\"social-icon\" data-social-icon=\"youtube\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><rect class=\"social-piece youtube-screen\" x=\"0\" y=\"3.55\" width=\"24\" height=\"16.9\" rx=\"5\"/><g class=\"social-piece youtube-play\"><path class=\"social-cutout\" d=\"M9.545 8.432 15.818 12l-6.273 3.568z\"/></g></svg>",
  "spotify": "<svg class=\"social-icon\" data-social-icon=\"spotify\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"12\"/><g fill=\"none\" class=\"social-cutout-stroke\" stroke-linecap=\"round\"><path class=\"social-piece bass-one\" d=\"M4.8 8.5Q12 6.3 19.5 9.7\" stroke-width=\"2\"/><path class=\"social-piece bass-two\" d=\"M5.8 12.1Q12 10.3 18.2 13.5\" stroke-width=\"1.8\"/><path class=\"social-piece bass-three\" d=\"M6.7 16Q12 14.8 17 17\" stroke-width=\"1.5\"/></g></svg>",
  "letterboxd": "<svg class=\"social-icon\" data-social-icon=\"letterboxd\" viewBox=\"0 0 640 512\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece reel-right\" d=\"M521.3 128C586.9 128 640 181.1 640 246.6S586.9 365.2 521.3 365.2c-42.5 0-79.7-22.3-100.7-55.8 11.4-18.2 18-39.7 18-62.8s-6.6-44.6-18-62.8l.8-1.2c20.8-32.3 56.8-53.9 97.9-54.6l2 0z\"/><path class=\"social-piece reel-middle\" d=\"M320 128c42.5 0 79.7 22.3 100.7 55.8-11.4 18.2-18 39.7-18 62.8s6.6 44.6 18 62.8l-.8 1.2c-20.8 32.3-56.8 53.9-97.9 54.6l-2 0c-42.5 0-79.7-22.3-100.7-55.8 11.4-18.2 18-39.7 18-62.8s-6.6-44.6-18-62.8l.8-1.2c20.8-32.3 56.8-53.9 97.9-54.6l2 0z\"/><path class=\"social-piece reel-left\" d=\"M118.7 128c42.5 0 79.7 22.3 100.7 55.8-11.4 18.2-18 39.7-18 62.8s6.6 44.6 18 62.8l-.8 1.2c-20.8 32.3-56.8 53.9-97.9 54.6l-2 0C53.1 365.1 0 312.1 0 246.6S53.1 128 118.7 128z\"/></svg>",
  "steam": "<svg class=\"social-icon\" data-social-icon=\"steam\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece steam-mark\" d=\"M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z\"/></svg>",
  "github": "<svg class=\"social-icon\" data-social-icon=\"github\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"github-shape\" d=\"M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12\" data-morph-a=\"M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-.023.105-1.676 0 0 1.005-.322 3.3-.27.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12\" data-morph-b=\"M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-.052 3.285.27 3.285.27.645.153.24 1.373.12 1.676.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12\"/></svg>",
  "osu": "<svg class=\"social-icon\" data-social-icon=\"osu\" viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\"><path class=\"social-piece osu-word\" d=\"M7.698 10.362c-.1855-.2184-.4189-.3905-.7002-.5162-.2813-.1257-.6104-.1885-.9874-.1885s-.7046.0628-.9829.1885-.5088.2978-.6912.5162c-.1827.2185-.3203.4773-.413.7765-.0928.2993-.1391.6194-.1391.9605 0 .3412.0463.6584.1391.9516.0927.2933.2303.5491.413.7675.1824.2185.4129.3891.6912.5116.2783.1226.6059.1841.9829.1841s.7061-.0615.9875-.1841c.2813-.1226.5146-.2931.7002-.5116.1855-.2184.3231-.4742.413-.7675.0897-.2931.1346-.6104.1346-.9516 0-.3411-.0449-.6612-.1346-.9605-.0899-.2992-.2276-.558-.4131-.7765zm-.965 2.8096c-.1467.2484-.3875.3725-.7227.3725-.3291 0-.567-.1241-.7136-.3725-.1467-.2483-.2199-.6059-.2199-1.0727s.0732-.8243.2199-1.0727c.1466-.2482.3844-.3725.7136-.3725.3352 0 .5759.1243.7227.3725.1466.2484.2199.6059.2199 1.0727.0001.4668-.0733.8245-.2199 1.0727zm11.8894-.8303-.0898-4.3896a4.5409 4.5409 0 0 1 .6912-.0539c.2334 0 .4668.0179.7002.0539l-.0898 4.3896c-.2096.0359-.41.0538-.6015.0538a3.4957 3.4957 0 0 1-.6103-.0538zm1.3196 1.4003c0 .2215-.0179.443-.0538.6643a4.2055 4.2055 0 0 1-.6553.0538 4.1414 4.1414 0 0 1-.6642-.0538 4.0882 4.0882 0 0 1-.0539-.6553c0-.2154.018-.4367.0539-.6643a4.0876 4.0876 0 0 1 .6552-.0538c.2155 0 .4368.018.6643.0538.0359.2276.0538.446.0538.6553zm-3.2226-4.0305c.2095 0 .422.018.6373.0539v4.4614c-.1916.0659-.4443.1302-.7585.193-.3141.0629-.6418.0943-.9829.0943-.3052 0-.5985-.024-.8798-.0718-.2813-.0479-.5282-.1495-.7405-.3052-.2125-.1555-.3815-.3829-.5072-.6823-.1257-.2991-.1885-.697-.1885-1.1938V9.765a3.8725 3.8725 0 0 1 .6373-.0539c.2094 0 .4219.018.6373.0539v2.4596c0 .2455.0194.4474.0584.6059.0388.1586.0988.2843.1795.377a.6606.6606 0 0 0 .3007.1974c.1197.0391.2603.0584.4219.0584.2214 0 .407-.0209.5566-.0628V9.765a3.8218 3.8218 0 0 1 .6284-.0539zm-4.3625 2.6841c.0538.1497.0808.3321.0808.5476 0 .2215-.0464.428-.1392.6194-.0928.1916-.2274.3577-.4039.4982-.1766.1407-.3905.2514-.6418.3322-.2514.0808-.5356.1212-.8528.1212a5.2984 5.2984 0 0 1-.395-.0135 3.1226 3.1226 0 0 1-.3456-.0448 4.0482 4.0482 0 0 1-.3277-.0763 3.9336 3.9336 0 0 1-.35-.1166 2.5768 2.5768 0 0 1 .0852-.4893 3.0737 3.0737 0 0 1 .1751-.4802c.1975.0779.3844.1362.561.1751.1765.039.3605.0584.5521.0584.0838 0 .175-.0075.2738-.0225a.9945.9945 0 0 0 .2737-.0808.6467.6467 0 0 0 .2109-.1526c.0569-.0628.0853-.145.0853-.2469 0-.1436-.0434-.2469-.1302-.3097-.0868-.0628-.208-.1181-.3636-.1661l-.5565-.1616c-.3352-.0956-.5969-.2379-.7855-.4263-.1885-.1886-.2827-.4713-.2827-.8484 0-.4547.163-.8108.4892-1.0682.3261-.2573.7705-.386 1.333-.386.2334 0 .4638.0211.6913.0629.2273.0419.4578.1048.6912.1885-.012.1557-.0419.3173-.0897.4847-.048.1676-.1048.3142-.1706.4398a3.58 3.58 0 0 0-.4757-.1571 2.18 2.18 0 0 0-.5477-.0673c-.2034 0-.3621.0314-.4758.0943-.1137.0629-.1705.1631-.1705.3007 0 .1317.0403.2244.1211.2783.0809.0538.1959.1048.3456.1526l.5117.1526c.1675.048.3187.1063.4533.1751.1347.0688.2498.1541.3456.2558.0958.1016.1707.2272.2246.3768z\"/><path class=\"social-piece osu-ring\" d=\"M12 0C5.3726 0 0 5.3726 0 12.0001 0 18.6273 5.3726 24 12 24c6.6275 0 12-5.3727 12-11.9999C24 5.3726 18.6275 0 12 0zm0 22.8c-5.9647 0-10.8-4.8354-10.8-10.7999C1.2 6.0353 6.0353 1.2 12 1.2s10.8 4.8353 10.8 10.8001C22.8 17.9646 17.9647 22.8 12 22.8z\"/><circle class=\"social-piece osu-echo\" cx=\"12\" cy=\"12\" r=\"11.4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\".7\"/></svg>"
};
  // social-art:end
  const profiles = [
    { name: 'Email', icon: 'envelope', copy: 'hi@muhammedtariq.com' },
    { name: 'LinkedIn', icon: 'linkedin-in', href: 'https://www.linkedin.com/in/muhammed5371/' },
    { name: 'Personal website', icon: 'globe', href: 'https://www.muhammedtariq.com/' },
    { name: 'Substack', icon: 'substack', href: 'https://substack.com/@seriaura' },
    { name: 'X', icon: 'x', href: 'https://x.com/Seriaura_' },
    { name: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/_muhammedtariq/' },
    { name: 'Discord', icon: 'discord', copy: 'seriaura' },
    { name: 'Strava', icon: 'strava', href: 'https://www.strava.com/athletes/160737412' },
    { name: 'Goodreads', icon: 'goodreads', href: 'https://www.goodreads.com/user/show/193354807-muhammed-tariq' },
    { name: 'Snapchat', icon: 'snapchat', copy: 'seriaura' },
    { name: 'YouTube', icon: 'youtube', href: 'https://www.youtube.com/@seriaura' },
    { name: 'Spotify', icon: 'spotify', href: 'https://open.spotify.com/user/h32v6o66m76ypv7ztlzv1q0pc?si=60d42ea38a4e4dc0' },
    { name: 'Letterboxd', icon: 'letterboxd', href: 'https://letterboxd.com/Seriaura/' },
    { name: 'Steam', icon: 'steam', href: 'https://steamcommunity.com/id/Seriaura/' },
    { name: 'GitHub', icon: 'github', href: 'https://github.com/Muhammed-Tariq' },
    { name: 'osu!', icon: 'osu', href: 'https://osu.ppy.sh/users/18736758' }
  ];
  const grid = footer.querySelector('.social-links');
  const shapeSources = new WeakMap(), shapeStops = new Set();
  const smooth = t => t*t*(3-2*t);
  function drawSphere(control, angle) {
    const front=[],back=[];
    const project=(x,y,z)=>{
      const yy=y*.94-z*.342,zz=y*.342+z*.94;
      return [12+(x*.978-yy*.208)*10.3,12+(x*.208+yy*.978)*10.3,zz];
    };
    const line=points=>{
      let prior=null;
      for(const p of points){const side=p[2]>=0?'front':'back',out=side==='front'?front:back;
        out.push((side===prior?'L':'M')+p[0].toFixed(3)+' '+p[1].toFixed(3));prior=side;}
    };
    for(let j=0;j<3;j++){
      const lon=j*Math.PI/3+angle+.3,points=[];
      for(let i=0;i<=72;i++){const lat=i*Math.PI/36;points.push(project(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)));}
      line(points);
    }
    for(const lat of [-.6,0,.6]){
      const points=[];
      for(let i=0;i<=72;i++){const lon=i*Math.PI/36;points.push(project(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)));}
      line(points);
    }
    control.querySelector('.globe-front').setAttribute('d',front.join(''));
    control.querySelector('.globe-back').setAttribute('d',back.join(''));
  }
  function shapeGesture(control) {
    const platform=control.dataset.platform;
    if(!['globe','snapchat','github'].includes(platform))return Promise.resolve();
    const duration=platform==='github'?1200:1500;
    let render,reset;
    if(platform==='globe'){
      render=t=>drawSphere(control,smooth(t)*Math.PI*2/3);
      reset=()=>drawSphere(control,0);
    }else{
      const path=control.querySelector('[data-morph-a]');
      let source=shapeSources.get(path);
      if(!source){
        const number=/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g;
        const original=path.getAttribute('d');
        source={original,parts:original.split(number),values:[original,path.dataset.morphA,path.dataset.morphB].map(d=>d.match(number).map(Number))};
        shapeSources.set(path,source);
      }
      const poses=platform==='snapchat'?[[0,0,0],[.18,1,0],[.38,0,1],[.58,.75,0],[.77,0,.5],[1,0,0]]:[[0,0,0],[.18,1,0],[.35,0,0],[.53,0,1],[.7,0,0],[.82,.45,.45],[1,0,0]];
      render=t=>{
        const end=poses.findIndex(p=>p[0]>=t),a=poses[Math.max(0,end-1)],b=poses[Math.max(0,end)];
        const f=b[0]===a[0]?0:smooth((t-a[0])/(b[0]-a[0])),wa=a[1]+(b[1]-a[1])*f,wb=a[2]+(b[2]-a[2])*f;
        const [base,one,two]=source.values;
        path.setAttribute('d',base.map((v,i)=>source.parts[i]+' '+(v+(one[i]-v)*wa+(two[i]-v)*wb).toFixed(4)+' ').join('')+source.parts.at(-1));
      };
      reset=()=>path.setAttribute('d',source.original);
    }
    return new Promise(resolve=>{
      const start=performance.now();let frame;
      const stop=()=>{cancelAnimationFrame(frame);reset();shapeStops.delete(stop);resolve();};
      const tick=now=>{
        const t=Math.min(1,(now-start)/duration);
        if(t===1||reducedMotion.matches||document.hidden||!control.isConnected){stop();return;}
        render(t);frame=requestAnimationFrame(tick);
      };
      shapeStops.add(stop);frame=requestAnimationFrame(tick);
    });
  }
  function createControl(profile) {
    if (!profile) {
      const empty = document.createElement('span');
      empty.className = 'social-link social-empty';
      empty.setAttribute('aria-hidden','true');
      empty.innerHTML = '<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg>';
      return empty;
    }
    const control = document.createElement(profile.copy ? 'button' : 'a');
    control.className = 'social-link';
    control.dataset.platform = profile.icon;
    control.setAttribute('aria-label', profile.copy ? `Copy ${profile.name}: ${profile.copy}` : profile.name);
    if (profile.copy) { control.type = 'button'; control.dataset.copy = profile.copy; control.dataset.copyLabel = profile.name; }
    else {
      control.href = profile.href;
      if (new URL(profile.href).origin !== root.origin) {control.target = '_blank'; control.rel = 'noopener noreferrer';}
    }
    control.innerHTML = socialIconArt[profile.icon];
    if(profile.icon==='x'){
      // Clip only the moving artwork at the grid dividers, leaving the cell's
      // shared fading highlight free to extend past the outer grid edge.
      const viewport=document.createElement('span');viewport.className='social-icon-viewport';
      viewport.append(control.querySelector('svg'));control.append(viewport);
    }
    if(profile.icon==='globe')drawSphere(control,0);
    // Finish a small gesture even after hover leaves, rather than snapping back.
    const playGesture = () => {
      if (reducedMotion.matches || grid.hasAttribute('aria-busy') || control.classList.contains('is-animating')) return;
      control.classList.add('is-animating');
      const animations = control.getAnimations({subtree:true}).filter(animation => animation.animationName);
      Promise.allSettled([...animations.map(animation => animation.finished),shapeGesture(control)]).then(() => control.classList.remove('is-animating'));
    };
    control.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') playGesture(); });
    control.addEventListener('focus', () => { if (control.matches(':focus-visible')) playGesture(); });
    return control;
  }
  const pages = [];
  for (let start = 0; start < profiles.length; start += 8) {
    pages.push(Array.from({length:8}, (_,i) => createControl(profiles[start+i])));
  }
  const pager = document.createElement('button');
  pager.type = 'button';
  pager.className = 'social-link social-page';
  pager.setAttribute('aria-controls', grid.id);
  grid.append(pager);
  let requestedPage = 0, transitionSerial = 0, activeAnimations = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function showPage(index, announce = false) {
    grid.querySelectorAll('.social-link:not(.social-page)').forEach(control => control.remove());
    pages[index].slice(0,4).forEach(control => grid.insertBefore(control,pager));
    grid.append(...pages[index].slice(4));
    grid.dataset.page = String(index+1);
    pager.innerHTML = `<span class="social-page-number" aria-hidden="true">${index+1}</span>`;
    pager.setAttribute('aria-label', `Links page ${index+1} of ${pages.length}. Show page ${(index+1)%pages.length+1}`);
    if (announce) footer.querySelector('.social-page-status').textContent = `Links page ${index+1} of ${pages.length}`;
  }
  function cancelAnimations() {
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations = [];
  }
  function animateIcons(entering) {
    return [...grid.children].map((cell,i) => {
      const icon = cell.querySelector('.social-icon,.empty-icon,.social-page-number');
      const x = 1-i%3, y = 1-Math.floor(i/3);
      const inward = `translate(${x*10}px,${y*10}px) perspective(160px) rotateX(${-y*18}deg) rotateY(${x*18}deg) rotateZ(${x*12}deg) scale(.65)`;
      const resting = {opacity:1,transform:getComputedStyle(icon).transform};
      const hidden = {opacity:0,transform:inward};
      return icon.animate(entering ? [hidden,resting] : [resting,hidden], {
        duration:entering ? 220 : 160, easing:'cubic-bezier(.22,1,.36,1)', fill:'forwards'
      });
    });
  }
  async function transitionPage(index) {
    const serial = ++transitionSerial;
    cancelAnimations();
    if (reducedMotion.matches) {showPage(index,true); grid.removeAttribute('aria-busy'); return;}
    grid.setAttribute('aria-busy','true');
    activeAnimations = animateIcons(false);
    await Promise.all(activeAnimations.map(animation => animation.finished.catch(() => {})));
    if (serial !== transitionSerial) return;
    showPage(index,true);
    cancelAnimations();
    activeAnimations = animateIcons(true);
    await Promise.all(activeAnimations.map(animation => animation.finished.catch(() => {})));
    if (serial !== transitionSerial) return;
    cancelAnimations();
    grid.removeAttribute('aria-busy');
  }
  showPage(0);
  pager.addEventListener('click', () => {
    requestedPage = (requestedPage+1)%pages.length;
    transitionPage(requestedPage);
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    shapeStops.forEach(stop=>stop());
    transitionSerial++;
    cancelAnimations();
    showPage(requestedPage,true);
    grid.removeAttribute('aria-busy');
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)shapeStops.forEach(stop=>stop());});
  let statusTimer;
  async function copyText(button) {
    const value = button.dataset.copy;
    const status = footer.querySelector('.copy-status');
    clearTimeout(statusTimer);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const input = document.createElement('textarea');
        input.value = value; input.style.cssText = 'position:fixed;opacity:0;left:0;top:0';
        document.body.append(input); input.select();
        const copied = document.execCommand('copy'); input.remove(); button.focus({ preventScroll: true });
        if (!copied) throw new Error('Copy unavailable');
      }
      status.textContent = `${button.dataset.copyLabel || 'Text'} copied: ${value}`;
      button.classList.add('is-copied');
      setTimeout(() => button.classList.remove('is-copied'), 1800);
    } catch {
      status.textContent = `Copy unavailable. ${value}`;
    }
    status.classList.add('is-visible');
    statusTimer = setTimeout(() => status.classList.remove('is-visible'), 4500);
  }
  footer.addEventListener('click', event => {
    const button = event.target.closest('[data-copy]');
    if (button) copyText(button);
  });
  document.querySelectorAll('[data-copy]').forEach(button => {
    if (!footer.contains(button)) button.addEventListener('click', () => copyText(button));
  });
  document.querySelectorAll('.brand').forEach(brand => brand.addEventListener('click', event => {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = new URL(brand.href);
    if (destination.pathname === location.pathname && location.hash === '#home') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }));
})();
