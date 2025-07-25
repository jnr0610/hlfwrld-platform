# Domain Configuration Setup

## Email Links Configuration

The booking system sends emails with links to the appointment system. These links need to be configured with your actual domain name for production use.

### Current Configuration

The system uses the `FRONTEND_DOMAIN` environment variable to generate all email links. By default, it uses `localhost:8001` for development.

### Setting Up for Production

1. **Create a `.env` file in the backend directory:**

```bash
# AWS SES Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_SES_FROM_EMAIL=your-verified-email@gmail.com

# Frontend Domain Configuration
# For development: localhost:8001
# For production: yourdomain.com (without http://)
FRONTEND_DOMAIN=yourdomain.com

# Other Configuration
SECRET_KEY=your_secret_key_here
```

2. **Replace `yourdomain.com` with your actual domain name**

Examples:
- `FRONTEND_DOMAIN=bookingapp.com`
- `FRONTEND_DOMAIN=mybeautysalon.com`
- `FRONTEND_DOMAIN=app.yourdomain.com`

### What Gets Updated

When you set `FRONTEND_DOMAIN`, all email links will automatically use your domain:

- **Appointment System Links**: `https://yourdomain.com/appointment-system.html?request=123`
- **Booking Success Links**: `https://yourdomain.com/booking-success.html?session_id=...`
- **Payment Cancel Links**: `https://yourdomain.com/reservation.html?requestId=...`

### Development vs Production

- **Development**: `FRONTEND_DOMAIN=localhost:8001`
- **Production**: `FRONTEND_DOMAIN=yourdomain.com`

### Important Notes

1. **No http:// prefix**: The system automatically adds the protocol
2. **HTTPS for production**: Make sure your domain supports HTTPS
3. **Domain verification**: Ensure your domain is properly configured and accessible
4. **Email deliverability**: Using a real domain name will significantly improve email deliverability and reduce spam folder placement

### Testing

After updating the domain, test the email functionality to ensure all links work correctly with your domain. 