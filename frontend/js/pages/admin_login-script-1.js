    function togglePass(btn) {
      const input = document.getElementById('adminPass');
      const icon  = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa fa-eye';
      }
    }
  