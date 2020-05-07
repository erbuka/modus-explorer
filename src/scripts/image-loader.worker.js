self.addEventListener('message', async event => {
    const url = event.data;

    const response = await fetch("/" + url);
    const blob = await response.blob();

    self.postMessage({
        originalUrl: url,
        blobUrl: URL.createObjectURL(blob)
    });
})