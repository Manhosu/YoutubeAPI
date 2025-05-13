module.exports = {
  rewrites: () => {
    return [
      {
        source: '/(.*)',
        destination: '/index.html',
      },
    ];
  },
}; 