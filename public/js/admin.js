(function () {
  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';

  function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.modal-close-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var overlay = btn.closest('.modal-overlay');
      if (overlay) closeModal(overlay.id);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  function showToast(msg, type) {
    var c = document.getElementById('toastContainer');
    var icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 300);
    }, 3000);
  }

  // Photo preview
  document.getElementById('addFotoInput').addEventListener('change', function () {
    if (this.files[0]) {
      var r = new FileReader();
      r.onload = function (e) {
        document.getElementById('addPhotoPreview').innerHTML = '<img src="' + e.target.result + '">';
      };
      r.readAsDataURL(this.files[0]);
    }
  });

  document.getElementById('editFotoInput').addEventListener('change', function () {
    if (this.files[0]) {
      var r = new FileReader();
      r.onload = function (e) {
        document.getElementById('editPhotoPreview').innerHTML = '<img src="' + e.target.result + '">';
      };
      r.readAsDataURL(this.files[0]);
    }
  });

  // Tambah menu
  document.getElementById('btnAddMenu').addEventListener('click', function () {
    openModal('addMenuModal');
  });

  // Edit & Delete menu (event delegation)
  document.getElementById('menuTableBody').addEventListener('click', function (e) {
    var editBtn = e.target.closest('.btn-edit');
    var deleteBtn = e.target.closest('.btn-delete');

    if (editBtn) {
      var row = editBtn.closest('tr');
      document.getElementById('editId').value = row.getAttribute('data-id');
      document.getElementById('editNama').value = row.getAttribute('data-nama');
      document.getElementById('editDeskripsi').value = row.getAttribute('data-deskripsi');
      document.getElementById('editHarga').value = row.getAttribute('data-harga');
      document.getElementById('editKategori').value = row.getAttribute('data-kategori');
      var f = row.getAttribute('data-foto');
      document.getElementById('editPhotoPreview').innerHTML = f
        ? '<img src="/uploads/' + f + '">'
        : '<i class="fas fa-cloud-upload-alt"></i>';
      document.getElementById('editFotoInput').value = '';
      openModal('editMenuModal');
    }

    if (deleteBtn) {
      var row = deleteBtn.closest('tr');
      var id = row.getAttribute('data-id');
      var nama = row.getAttribute('data-nama');
      document.getElementById('confirmText').textContent = 'Hapus menu "' + nama + '"?';
      document.getElementById('confirmBtn').onclick = function () {
        fetch('/admin/menu/delete/' + id, {
          method: 'POST',
          headers: {
            'x-csrf-token': csrfToken
          }
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.success) {
              row.style.transition = 'all 0.4s';
              row.style.opacity = '0';
              row.style.transform = 'translateX(40px)';
              setTimeout(function () { row.remove(); }, 400);
              showToast('Berhasil dihapus', 'success');
            } else {
              showToast('Gagal menghapus', 'error');
            }
            closeModal('confirmModal');
          });
      };
      openModal('confirmModal');
    }
  });

  // Update status pesanan
  document.getElementById('orderTableBody').addEventListener('change', function (e) {
    var sel = e.target.closest('.status-select');
    if (!sel) return;
    var row = sel.closest('tr');
    var id = row.getAttribute('data-id');
    var status = sel.value;
    fetch('/admin/pesanan/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ id: id, status: status })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success) {
          var badge = row.querySelector('.status-badge');
          badge.className = 'status-badge status-' + status;
          badge.textContent = status;
          showToast('Status: ' + status, 'info');
        }
      });
  });
})();