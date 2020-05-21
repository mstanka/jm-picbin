if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require('@azure/storage-blob');

const express = require('express');
const router = express.Router();
const containerName1 = 'thumbnails';
const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');
const containerName2 = 'img';
const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const ONE_MINUTE = 60 * 1000;
const Str = require('@supercharge/strings')

const sharedKeyCredential = new StorageSharedKeyCredential(
  process.env.AZURE_STORAGE_ACCOUNT_NAME,
  process.env.AZURE_STORAGE_ACCOUNT_ACCESS_KEY);
const pipeline = newPipeline(sharedKeyCredential);

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
  pipeline
);

const getBlobName = originalName => {
  // Use a random number to generate a unique file name, 
  // removing "0." from the start of the string.
  const identifier = Str.random(5)  
  return `${identifier}`;
};

// home page
router.get('/', async (req, res, next) => {

  let viewData;

  try {
    viewData = {
      title: 'Pic Ninja',
      viewName: 'index',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: containerName1
    };
  } catch (err) {
    viewData = {
      title: 'Error',
      viewName: 'error',
      message: 'There was an error contacting the blob storage container.',
      error: err
    };
    res.status(500);
  } finally {
    res.render(viewData.viewName, viewData);
  }
});

// adminview
router.get('/adminview', async (req, res, next) => {

  let viewData;

  try {
    const containerClient = blobServiceClient.getContainerClient('img');
    const listBlobsResponse = await containerClient.listBlobFlatSegment();

    for await (const blob of listBlobsResponse.segment.blobItems) {
      console.log(`Blob: ${blob.name}`);
    }

    viewData = {
      title: 'Pic Ninja Admin View',
      viewName: 'adminview',
      accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
      containerName: 'img'
    };

    if (listBlobsResponse.segment.blobItems.length) {
      viewData.thumbnails = listBlobsResponse.segment.blobItems;
    }
    console.log('test')
  } catch (err) {
    viewData = {
      title: 'Error',
      viewName: 'error',
      message: 'There was an error contacting the blob storage container.',
      error: err
    };
    res.status(500);
  } finally {
    res.render(viewData.viewName, viewData);
  }
});

// uploaded image view + adjustments
router.get('/i/\\S+', async (req, res) => {
  let viewData;
  //const redirectTo =  `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName2}` + req.path
  const path = req.path.split('/')[2]
  const imageUrl = `https://picbin-resize-url.azurewebsites.net/${containerName2}/${path}`
  const publicImageUrl =  req.protocol + '://' + req.get('host') + "/" + path;
  const privateImageUrl =  req.protocol + '://' + req.get('host') + "/i/" + path;
  console.log(`priv ${privateImageUrl}`)
  viewData = {
    title: 'Pic Ninja Image',
    viewName: 'image',
    imageUrl: imageUrl,
    shortImageUrl: publicImageUrl,
    privateImageUrl: privateImageUrl
  };
  
  res.render(viewData.viewName, viewData);
});


// simple image view 
router.get('/\\S+', async (req, res) => {
  let viewData;
  const imageUrl = `https://picbin-resize-url.azurewebsites.net/${containerName2}${req.path}`
  shortUrl =  req.protocol + '://' + req.get('host') + req.originalUrl;

  viewData = {
    title: 'Pic Ninja Image',
    viewName: 'simple-view',
    imageUrl: imageUrl,
    shortImageUrl: shortUrl
  };

  //console.log('redirecting to ', redirectTo)
  //res.redirect(m)
  
  res.render(viewData.viewName, viewData);
});


// router.post('/', uploadStrategy, async (req, res) => {
//   const blobName = getBlobName(req.file.originalname);
//   const stream = getStream(req.file.buffer);
//   const containerClient = blobServiceClient.getContainerClient(containerName2);
//   const blockBlobClient = containerClient.getBlockBlobClient(blobName);
//   const imageUrl = blockBlobClient.url;
//   const shortUrl = req.headers.origin + '/' + blobName
//   const sourceIpAddress = req.socket.localAddress

//   try {
//     await blockBlobClient.uploadStream(stream,
//       uploadOptions.bufferSize, uploadOptions.maxBuffers,
//       { 
//         blobHTTPHeaders: { blobContentType: "image/jpeg" }, 
//         metadata: {souceIp: sourceIpAddress}
//       }
//     );
//     res.render('success', { imageUrl: shortUrl });
//   } catch (err) {
//     res.render('error', { message: err.message });
//   }
// });

module.exports = router;
