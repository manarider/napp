const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * แลก authorization code จาก UMS เป็น JWT token ของระบบ NAPP
 *
 * UMS Response:
 * {
 *   status: 'success',
 *   token: 'UMS_JWT_TOKEN',
 *   user: { id, username, email, firstName, lastName, role, phone }
 * }
 *
 * Role Mapping (UMS → NAPP):
 *  - superadmin → admin
 *  - admin      → admin
 *  - member     → user
 *  - user       → user (fallback)
 */
const exchangeCode = async (req, res) => {
  try {
    const { code, projectCode } = req.body;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 UMS Exchange Code Request');
    console.log('   📥 Method:', req.method);
    console.log('   📥 IP:', req.ip);
    console.log('   📥 Origin:', req.headers.origin || '(no origin)');
    console.log('   📥 Referer:', req.headers.referer || '(no referer)');
    console.log('   📥 User-Agent:', req.headers['user-agent']);
    console.log('   📥 Content-Type:', req.headers['content-type']);
    console.log('   📥 Body Keys:', Object.keys(req.body || {}));
    console.log('   📥 code:', code);
    console.log('   📥 projectCode:', projectCode);

    if (!code || !projectCode) {
      return res.status(400).json({
        status: 'error',
        error: 'กรุณาระบุ code และ projectCode',
      });
    }

    // เรียก UMS API
    const umsBaseUrl = process.env.UMS_BASE_URL.replace(/\/$/, '');
    const umsUrl = `${umsBaseUrl}/api/auth/exchange-code`;

    console.log(`   🔄 Calling: POST ${umsUrl}`);

    const umsResponse = await axios.post(
      umsUrl,
      { code, projectCode },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        validateStatus: () => true,
      }
    );

    console.log(`   📤 UMS Status: ${umsResponse.status}`);
    console.log('   📤 UMS Response:', JSON.stringify(umsResponse.data, null, 2));

    const responseData = umsResponse.data || {};

    if (umsResponse.status !== 200 || responseData.status !== 'success') {
      const errMsg = responseData.message || 'ไม่สามารถแลก code กับ UMS ได้';
      console.log(`   ❌ UMS Error: ${errMsg}`);
      return res.status(400).json({
        status: 'error',
        error: errMsg,
      });
    }

    const umsUser = responseData.user;

    if (!umsUser || !umsUser.id) {
      console.log('   ❌ Invalid user data from UMS');
      return res.status(400).json({
        status: 'error',
        error: 'ข้อมูลผู้ใช้จาก UMS ไม่ถูกต้อง',
      });
    }

    // 🎯 Role Mapping
    const originalRole = String(umsUser.role || 'member').toLowerCase();
    let mappedRole = 'user';
    if (originalRole === 'admin' || originalRole === 'superadmin') {
      mappedRole = 'admin';
    } else if (originalRole === 'member' || originalRole === 'user') {
      mappedRole = 'user';
    }

    console.log(`   🎯 Role: ${originalRole} → ${mappedRole}`);

    // สร้าง JWT token ของระบบ NAPP
    const token = jwt.sign(
      {
        id: `ums_${umsUser.id}`,
        role: mappedRole,
        source: 'ums',
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // ประกอบ user object
    const fullName =
      [umsUser.firstName, umsUser.lastName].filter(Boolean).join(' ').trim() ||
      umsUser.username ||
      'UMS User';

    const user = {
      id: `ums_${umsUser.id}`,
      fullName,
      email: umsUser.email || `${umsUser.username}@ums.local`,
      department: umsUser.department || 'UMS',
      role: mappedRole,
      source: 'ums',
      umsData: {
        originalRole,
        username: umsUser.username,
        firstName: umsUser.firstName,
        lastName: umsUser.lastName,
        phone: umsUser.phone,
      },
    };

    console.log(`   ✅ Login success: ${user.fullName} (${mappedRole})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return res.json({
      status: 'success',
      token,
      user,
    });
  } catch (error) {
    console.error('❌ Exchange Code Error:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        status: 'error',
        error: 'UMS ตอบกลับช้าเกินไป กรุณาลองใหม่อีกครั้ง',
      });
    }

    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  exchangeCode,
};
