const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const OTP = require("../models/otpModel");

exports.sendResetPasswordOTP = async (req, res) => {
  const { email } = req.body;

  // Kiểm tra xem email có được cung cấp không
  if (!email) {
    return res.status(400).send({ Status: "Email rỗng" });
  }

  // Kiểm tra cú pháp email
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send({ Status: "Sai định dạng email" });
  }
  const user = await User.findOne({ email: email });
  if (!user) {
    return res.send({ Status: "Người dùng không tồn tại" });
  }

  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });
  const newOTP = new OTP({ email, otp });
  await newOTP.save();

  // Gửi email với mã OTP
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  var mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Mã OTP đặt lại mật khẩu",
    text: `Mã OTP của bạn là: ${otp}`,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      return res.status(200).json({
        success: true,
        message: "OTP đã được gửi thành công",
        otp,
      });
    }
  });
};

// Hàm xác thực OTP
exports.verifyResetPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    // Kiểm tra xem trường email và otp có rỗng không
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "OTP không được để trống",
      });
    }
    // Tìm OTP gần nhất cho email
    const response = await OTP.find({ email })
      .sort({ createdAt: -1 })
      .limit(1);
    if (response.length === 0 || otp !== response[0].otp) {
      return res.status(400).json({
        success: false,
        message: "Sai mã OTP",
      });
    }
    res.status(200).json({
      success: true,
      message: "OTP đã được xác thực thành công",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

// Hàm cập nhật mật khẩu
exports.updatePassword = async (req, res) => {
  // Kiểm tra xem trường email và newPassword có rỗng không
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email hoặc mật khẩu mới không được để trống",
    });
  }

  // Tìm người dùng dựa trên email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Người dùng không tồn tại",
    });
  }

  // Mã hóa mật khẩu mới
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Cập nhật mật khẩu
  user.password = hashedPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Mật khẩu đã được cập nhật thành công",
  });
};
