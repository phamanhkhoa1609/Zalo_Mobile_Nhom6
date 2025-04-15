const multer = require('multer')

const storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, '');
    },
});
const upload = multer({
    storage: storage,
    limits: {
        //giới hạn 256mb
        fileSize: 256*1024*1024,
    }
})

module.exports = upload;