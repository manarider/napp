// utils/timezone.js
// จัดการ Timezone สำหรับประเทศไทย (GMT+7)

const THAILAND_TIMEZONE_OFFSET = 7 * 60; // นาที

/**
 * แปลง Date object เป็นเวลาประเทศไทย
 * @param {Date} date 
 * @returns {Date}
 */
const toThailandTime = (date) => {
  if (!date) return null;
  
  const utcDate = new Date(date);
  const thailandTime = new Date(utcDate.getTime() + (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
  
  return thailandTime;
};

/**
 * แปลงเวลาประเทศไทยเป็น UTC
 * @param {Date} date 
 * @returns {Date}
 */
const toUTC = (date) => {
  if (!date) return null;
  
  const thailandDate = new Date(date);
  const utcTime = new Date(thailandDate.getTime() - (THAILAND_TIMEZONE_OFFSET * 60 * 1000));
  
  return utcTime;
};

/**
 * ดึงวันที่ปัจจุบันในประเทศไทย (เฉพาะวันที่ เวลา 00:00:00)
 * @returns {Date}
 */
const getTodayThailand = () => {
  const now = new Date();
  const thailandNow = toThailandTime(now);
  
  // ตั้งเวลาเป็น 00:00:00
  thailandNow.setHours(0, 0, 0, 0);
  
  return thailandNow;
};

/**
 * สร้างช่วงเวลาของวันที่กำหนด (00:00:00 - 23:59:59)
 * @param {Date|string} date 
 * @returns {Object} { startOfDay, endOfDay }
 */
const getDayRange = (date) => {
  const targetDate = new Date(date);
  
  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    0, 0, 0, 0
  );
  
  const endOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    23, 59, 59, 999
  );
  
  return { startOfDay, endOfDay };
};

/**
 * ฟอร์แมตวันที่เป็น String แบบไทย
 * @param {Date} date 
 * @returns {string} เช่น "13 ก.พ. 2026"
 */
const formatThaiDate = (date) => {
  if (!date) return '';
  
  const thailandDate = toThailandTime(date);
  
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  
  const day = thailandDate.getDate();
  const month = months[thailandDate.getMonth()];
  const year = thailandDate.getFullYear() + 543; // แปลงเป็น พ.ศ.
  
  return `${day} ${month} ${year}`;
};

/**
 * ฟอร์แมตวันที่และเวลาเป็น String แบบไทย
 * @param {Date} date 
 * @returns {string} เช่น "13 ก.พ. 2026 14:30"
 */
const formatThaiDateTime = (date) => {
  if (!date) return '';
  
  const thailandDate = toThailandTime(date);
  const dateStr = formatThaiDate(date);
  const hours = String(thailandDate.getHours()).padStart(2, '0');
  const minutes = String(thailandDate.getMinutes()).padStart(2, '0');
  
  return `${dateStr} ${hours}:${minutes}`;
};

/**
 * เปรียบเทียบว่าวันที่อยู่ในอดีตหรือไม่
 * @param {Date|string} date 
 * @returns {boolean}
 */
const isPastDate = (date) => {
  const targetDate = new Date(date);
  const today = getTodayThailand();
  
  return targetDate < today;
};

/**
 * เปรียบเทียบว่าวันที่อยู่ในอนาคตหรือไม่
 * @param {Date|string} date 
 * @returns {boolean}
 */
const isFutureDate = (date) => {
  const targetDate = new Date(date);
  const today = getTodayThailand();
  
  return targetDate > today;
};

/**
 * เปรียบเทียบว่าวันที่เป็นวันนี้หรือไม่
 * @param {Date|string} date 
 * @returns {boolean}
 */
const isToday = (date) => {
  const targetDate = new Date(date);
  const today = getTodayThailand();
  
  return targetDate.toDateString() === today.toDateString();
};

module.exports = {
  toThailandTime,
  toUTC,
  getTodayThailand,
  getDayRange,
  formatThaiDate,
  formatThaiDateTime,
  isPastDate,
  isFutureDate,
  isToday,
  THAILAND_TIMEZONE_OFFSET
};
