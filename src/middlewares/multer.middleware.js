// this middleware store the files in a local public/temp folder
// express plugin multer // get the below code same from npm site

import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
})

export const upload = multer({ storage: storage });