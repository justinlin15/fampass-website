// ============================================
// FAM Pass — Admin Panel Logic
// ============================================

(function () {
  var loginPanel = document.getElementById('loginPanel');
  var dashboardPanel = document.getElementById('dashboardPanel');
  var loginForm = document.getElementById('loginForm');
  var loginError = document.getElementById('loginError');
  var logoutBtn = document.getElementById('logoutBtn');

  // --- Auth State ---
  auth.onAuthStateChanged(function (user) {
    if (user) {
      loginPanel.style.display = 'none';
      dashboardPanel.style.display = 'block';
      loadPosts();
      loadFeedback();
    } else {
      loginPanel.style.display = 'block';
      dashboardPanel.style.display = 'none';
    }
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('loginEmail').value;
    var password = document.getElementById('loginPassword').value;
    loginError.style.display = 'none';

    auth.signInWithEmailAndPassword(email, password).catch(function (err) {
      loginError.textContent = 'Invalid email or password.';
      loginError.className = 'form-message form-message--error';
    });
  });

  logoutBtn.addEventListener('click', function () {
    auth.signOut();
  });

  // --- Tabs ---
  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('admin-tab--active'); });
      document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('admin-panel--active'); });
      tab.classList.add('admin-tab--active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('admin-panel--active');
    });
  });

  // === BLOG POSTS ===
  var postsList = document.getElementById('postsList');
  var editorForm = document.getElementById('editorForm');
  var postForm = document.getElementById('postForm');
  var newPostBtn = document.getElementById('newPostBtn');
  var cancelEditBtn = document.getElementById('cancelEditBtn');
  var deletePostBtn = document.getElementById('deletePostBtn');
  var contentInput = document.getElementById('postContentInput');
  var previewEl = document.getElementById('editorPreview');

  // Live markdown preview
  contentInput.addEventListener('input', function () {
    var raw = marked.parse(contentInput.value || '');
    previewEl.innerHTML = DOMPurify.sanitize(raw);
  });

  // Auto-generate slug from title
  document.getElementById('postTitleInput').addEventListener('input', function () {
    var slugInput = document.getElementById('postSlugInput');
    if (!document.getElementById('editingPostId').value) {
      slugInput.value = this.value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80);
    }
  });

  // New post
  newPostBtn.addEventListener('click', function () {
    resetEditor();
    document.getElementById('editorTitle').textContent = 'New Post';
    deletePostBtn.style.display = 'none';
    editorForm.classList.add('editor-form--active');
    postsList.style.display = 'none';
    newPostBtn.style.display = 'none';
    document.getElementById('postsHeading').style.display = 'none';
  });

  // Cancel edit
  cancelEditBtn.addEventListener('click', function () {
    editorForm.classList.remove('editor-form--active');
    postsList.style.display = 'block';
    newPostBtn.style.display = 'inline-flex';
    document.getElementById('postsHeading').style.display = 'block';
  });

  // Save post
  postForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var saveBtn = document.getElementById('savePostBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    var postId = document.getElementById('editingPostId').value;
    var tagsRaw = document.getElementById('postTags').value;
    var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : [];

    var data = {
      title: document.getElementById('postTitleInput').value.trim(),
      slug: document.getElementById('postSlugInput').value.trim(),
      excerpt: document.getElementById('postExcerpt').value.trim(),
      tags: tags,
      coverImage: document.getElementById('postCoverImage').value.trim(),
      author: document.getElementById('postAuthor').value.trim() || 'FAM Pass',
      content: contentInput.value,
      published: document.getElementById('postPublished').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (postId) {
        await db.collection('blog_posts').doc(postId).update(data);
      } else {
        data.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
        // Check slug uniqueness
        var existing = await db.collection('blog_posts').where('slug', '==', data.slug).limit(1).get();
        if (!existing.empty) {
          alert('A post with this slug already exists. Please choose a different slug.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Post';
          return;
        }
        await db.collection('blog_posts').add(data);
      }

      editorForm.classList.remove('editor-form--active');
      postsList.style.display = 'block';
      newPostBtn.style.display = 'inline-flex';
      document.getElementById('postsHeading').style.display = 'block';
      loadPosts();
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving post: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Post';
    }
  });

  // Delete post
  deletePostBtn.addEventListener('click', async function () {
    var postId = document.getElementById('editingPostId').value;
    if (!postId) return;
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;

    try {
      await db.collection('blog_posts').doc(postId).delete();
      editorForm.classList.remove('editor-form--active');
      postsList.style.display = 'block';
      newPostBtn.style.display = 'inline-flex';
      document.getElementById('postsHeading').style.display = 'block';
      loadPosts();
    } catch (err) {
      alert('Error deleting post: ' + err.message);
    }
  });

  // Load posts list
  async function loadPosts() {
    try {
      var snapshot = await db.collection('blog_posts').orderBy('updatedAt', 'desc').get();
      postsList.innerHTML = '';

      if (snapshot.empty) {
        postsList.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-light);">No posts yet. Click "New Post" to create one.</div>';
        return;
      }

      snapshot.forEach(function (doc) {
        var post = doc.data();
        var date = post.updatedAt ? post.updatedAt.toDate().toLocaleDateString() : 'Unsaved';
        var badge = post.published
          ? '<span class="admin-badge admin-badge--published">Published</span>'
          : '<span class="admin-badge admin-badge--draft">Draft</span>';

        var row = document.createElement('div');
        row.className = 'admin-post-row';
        row.innerHTML =
          '<div class="admin-post-row__info">' +
            '<div class="admin-post-row__title">' + escapeHTML(post.title) + ' ' + badge + '</div>' +
            '<div class="admin-post-row__meta">/resources/' + escapeHTML(post.slug) + ' &middot; Updated ' + date + '</div>' +
          '</div>' +
          '<div class="admin-post-row__actions">' +
            '<button class="btn btn--outline btn--sm edit-post-btn">Edit</button>' +
          '</div>';

        row.querySelector('.edit-post-btn').addEventListener('click', function () {
          editPost(doc.id, post);
        });

        postsList.appendChild(row);
      });
    } catch (err) {
      console.error('Load posts error:', err);
      postsList.innerHTML = '<div style="padding: 20px; color: var(--color-error);">Error loading posts. Check Firestore rules.</div>';
    }
  }

  function editPost(id, post) {
    document.getElementById('editingPostId').value = id;
    document.getElementById('editorTitle').textContent = 'Edit Post';
    document.getElementById('postTitleInput').value = post.title || '';
    document.getElementById('postSlugInput').value = post.slug || '';
    document.getElementById('postExcerpt').value = post.excerpt || '';
    document.getElementById('postTags').value = (post.tags || []).join(', ');
    document.getElementById('postCoverImage').value = post.coverImage || '';
    document.getElementById('postAuthor').value = post.author || 'FAM Pass';
    document.getElementById('postPublished').checked = post.published || false;
    contentInput.value = post.content || '';

    // Trigger preview
    var raw = marked.parse(contentInput.value || '');
    previewEl.innerHTML = DOMPurify.sanitize(raw);

    deletePostBtn.style.display = 'inline-flex';
    editorForm.classList.add('editor-form--active');
    postsList.style.display = 'none';
    newPostBtn.style.display = 'none';
    document.getElementById('postsHeading').style.display = 'none';
  }

  function resetEditor() {
    document.getElementById('editingPostId').value = '';
    document.getElementById('postTitleInput').value = '';
    document.getElementById('postSlugInput').value = '';
    document.getElementById('postExcerpt').value = '';
    document.getElementById('postTags').value = '';
    document.getElementById('postCoverImage').value = '';
    document.getElementById('postAuthor').value = 'FAM Pass';
    document.getElementById('postPublished').checked = false;
    contentInput.value = '';
    previewEl.innerHTML = '<p style="color: var(--color-text-light); font-style: italic;">Start typing to see preview...</p>';
  }

  // === FEEDBACK ===
  var feedbackList = document.getElementById('feedbackList');
  var feedbackEmpty = document.getElementById('feedbackEmpty');

  async function loadFeedback() {
    try {
      var snapshot = await db.collection('feedback').orderBy('createdAt', 'desc').get();
      feedbackList.innerHTML = '';

      if (snapshot.empty) {
        feedbackEmpty.style.display = 'block';
        return;
      }

      feedbackEmpty.style.display = 'none';

      snapshot.forEach(function (doc) {
        var fb = doc.data();
        var date = fb.createdAt ? fb.createdAt.toDate().toLocaleString() : 'Unknown';
        var unreadClass = fb.read ? '' : ' feedback-row--unread';

        var row = document.createElement('div');
        row.className = 'feedback-row' + unreadClass;
        row.innerHTML =
          '<div class="feedback-row__header">' +
            '<div>' +
              '<span class="feedback-row__name">' + escapeHTML(fb.name) + '</span>' +
              ' <span class="feedback-row__email">&lt;' + escapeHTML(fb.email) + '&gt;</span>' +
            '</div>' +
            '<span class="feedback-row__date">' + date + '</span>' +
          '</div>' +
          '<div class="feedback-row__message">' + escapeHTML(fb.message) + '</div>' +
          '<div class="feedback-row__actions">' +
            '<button class="btn btn--sm btn--outline mark-read-btn">' + (fb.read ? 'Mark Unread' : 'Mark Read') + '</button>' +
            '<button class="btn btn--sm btn--outline delete-feedback-btn" style="color: var(--color-error); border-color: var(--color-error);">Delete</button>' +
          '</div>';

        row.querySelector('.mark-read-btn').addEventListener('click', async function () {
          await db.collection('feedback').doc(doc.id).update({ read: !fb.read });
          loadFeedback();
        });

        row.querySelector('.delete-feedback-btn').addEventListener('click', async function () {
          if (confirm('Delete this feedback?')) {
            await db.collection('feedback').doc(doc.id).delete();
            loadFeedback();
          }
        });

        feedbackList.appendChild(row);
      });
    } catch (err) {
      console.error('Load feedback error:', err);
    }
  }

  // --- Helpers ---
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
})();
