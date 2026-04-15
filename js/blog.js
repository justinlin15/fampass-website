// ============================================
// FAM Pass — Resources System
// ============================================

(function () {
  const PAGE_SIZE = 10;
  let lastDoc = null;
  let loading = false;

  // Determine if we're viewing a post or the listing
  const pathParts = window.location.pathname.replace(/^\/(resources|blog)\/?/, '').split('/').filter(Boolean);
  const slug = pathParts[0] || null;

  if (slug) {
    showPost(slug);
  } else {
    showListing();
  }

  // --- Listing ---
  async function showListing() {
    document.getElementById('blogListing').style.display = 'block';
    document.getElementById('blogPost').style.display = 'none';
    await loadPosts();
  }

  async function loadPosts() {
    if (loading) return;
    loading = true;

    try {
      let query = db.collection('blog_posts')
        .where('published', '==', true)
        .orderBy('publishedAt', 'desc')
        .limit(PAGE_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      const grid = document.getElementById('blogGrid');
      const empty = document.getElementById('blogEmpty');
      const loadMore = document.getElementById('loadMore');

      if (snapshot.empty && !lastDoc) {
        empty.style.display = 'block';
        return;
      }

      snapshot.forEach(function (doc) {
        const post = doc.data();
        grid.appendChild(createCard(post));
        lastDoc = doc;
      });

      // Show load more if we got a full page
      if (snapshot.size === PAGE_SIZE) {
        loadMore.style.display = 'block';
      } else {
        loadMore.style.display = 'none';
      }
    } catch (err) {
      console.error('Error loading posts:', err);
      document.getElementById('blogEmpty').style.display = 'block';
    } finally {
      loading = false;
    }
  }

  function createCard(post) {
    const card = document.createElement('a');
    card.className = 'blog-card';
    card.href = '/resources/' + post.slug;

    const date = post.publishedAt ? formatDate(post.publishedAt.toDate()) : '';
    const tagsHTML = (post.tags || []).map(function (t) {
      return '<span class="blog-tag">' + escapeHTML(t) + '</span>';
    }).join('');

    let imageHTML;
    if (post.coverImage) {
      imageHTML = '<img class="blog-card__image" src="' + escapeHTML(post.coverImage) + '" alt="' + escapeHTML(post.title) + '">';
    } else {
      imageHTML = '<div class="blog-card__image blog-card__image--placeholder">&#128221;</div>';
    }

    card.innerHTML = imageHTML +
      '<div class="blog-card__body">' +
        '<div class="blog-card__tags">' + tagsHTML + '</div>' +
        '<h3 class="blog-card__title">' + escapeHTML(post.title) + '</h3>' +
        '<p class="blog-card__excerpt">' + escapeHTML(post.excerpt || '') + '</p>' +
        '<div class="blog-card__meta">' + date + (post.author ? ' &middot; ' + escapeHTML(post.author) : '') + '</div>' +
      '</div>';

    return card;
  }

  // Load more button
  var loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadPosts);
  }

  // --- Post ---
  async function showPost(slug) {
    document.getElementById('blogListing').style.display = 'none';
    document.getElementById('blogPost').style.display = 'block';

    try {
      const snapshot = await db.collection('blog_posts')
        .where('slug', '==', slug)
        .where('published', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        document.getElementById('postTitle').textContent = 'Post not found';
        document.getElementById('postContent').innerHTML = '<p>This post doesn\'t exist or has been removed. <a href="/resources/">Back to resources</a></p>';
        return;
      }

      const post = snapshot.docs[0].data();

      // Update page title and meta
      document.title = post.title + ' — FAM Pass Resources';
      updateMeta('description', post.excerpt || '');
      updateMeta('og:title', post.title + ' — FAM Pass Resources');
      updateMeta('og:description', post.excerpt || '');
      if (post.coverImage) {
        updateMeta('og:image', post.coverImage);
      }
      updateMeta('og:url', 'https://fampass.io/resources/' + post.slug);

      // Add JSON-LD structured data
      addStructuredData(post);

      // Render post
      var tagsEl = document.getElementById('postTags');
      tagsEl.innerHTML = (post.tags || []).map(function (t) {
        return '<span class="blog-tag">' + escapeHTML(t) + '</span>';
      }).join('');

      document.getElementById('postTitle').textContent = post.title;

      var date = post.publishedAt ? formatDate(post.publishedAt.toDate()) : '';
      document.getElementById('postMeta').textContent = date + (post.author ? ' · ' + post.author : '');

      var cover = document.getElementById('postCover');
      if (post.coverImage) {
        cover.src = post.coverImage;
        cover.alt = post.title;
        cover.style.display = 'block';
      }

      // Render markdown content
      var rawHTML = marked.parse(post.content || '');
      document.getElementById('postContent').innerHTML = DOMPurify.sanitize(rawHTML);

      // Update canonical
      var canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.href = 'https://fampass.io/resources/' + post.slug;

    } catch (err) {
      console.error('Error loading post:', err);
      document.getElementById('postTitle').textContent = 'Error loading post';
      document.getElementById('postContent').innerHTML = '<p>Something went wrong. <a href="/resources/">Back to resources</a></p>';
    }
  }

  // --- Helpers ---
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function updateMeta(name, content) {
    var isOg = name.startsWith('og:');
    var attr = isOg ? 'property' : 'name';
    var el = document.querySelector('meta[' + attr + '="' + name + '"]');
    if (el) {
      el.setAttribute('content', content);
    } else {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      el.setAttribute('content', content);
      document.head.appendChild(el);
    }
  }

  function addStructuredData(post) {
    var schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt || '',
      datePublished: post.publishedAt ? post.publishedAt.toDate().toISOString() : '',
      dateModified: post.updatedAt ? post.updatedAt.toDate().toISOString() : '',
      author: {
        '@type': 'Person',
        name: post.author || 'FAM Pass'
      },
      publisher: {
        '@type': 'Organization',
        name: 'FAM Pass',
        url: 'https://fampass.io'
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://fampass.io/resources/' + post.slug
      }
    };
    if (post.coverImage) {
      schema.image = post.coverImage;
    }
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
})();
