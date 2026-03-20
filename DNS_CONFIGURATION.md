# DNS Configuration Guide

To connect your school's domain (e.g., `school.edu`) to your reservation system server, you need to add a **DNS Record** in your domain provider's management console (e.g., Cloudflare, GoDaddy, or your school's internal DNS server).

---

## 1. Prerequisites

Before you start, you need your server's **Public IP Address**.
To find it, run this command on your Linux server:
```bash
curl ifconfig.me
```
*(Example IP: `123.123.123.123`)*

---

## 2. Adding the DNS Record

You will typically need to add an **"A Record"**.

### Record Details
| Field | Value | Description |
| :--- | :--- | :--- |
| **Type** | `A` | Links a domain name to an IPv4 address. |
| **Name** | `reservation` | The "subdomain". Your site will be `reservation.school.edu`. |
| **Value** | `123.123.123.123` | Your server's Public IP address. |
| **TTL** | `Auto` or `3600` | "Time to Live" (how long the record is cached). |

---

## 3. Propagation Time

After you save the record, it needs to "propagate" across the internet.
*   **Time**: This can take anywhere from **5 minutes to 24 hours**.
*   **Check Status**: You can use a tool like [DNSChecker.org](https://dnschecker.org/) to see if the record is active worldwide.

---

## 4. Special Case: School IT Administration

If your school manages its own domain, you likely don't have access to the DNS settings. You will need to **contact your school's IT administrator** with a request like this:

> **Subject:** DNS Request for Classroom Reservation System
>
> **Hi IT Team,**
>
> I am setting up a classroom reservation system for our school. Could you please add a DNS **A Record** pointing the subdomain `reservation.school.edu` to our server's IP address: **[YOUR_SERVER_IP_HERE]**?
>
> This will allow students and teachers to access the system at `https://reservation.school.edu`.
>
> Thank you!

---

## 5. Next Steps

Once the DNS record is active and you can `ping` your subdomain, you can proceed with:
1.  **Nginx Configuration**: Update the `server_name` in your Nginx config.
2.  **HTTPS (Certbot)**: Run `sudo certbot --nginx -d reservation.school.edu`.

---

## Troubleshooting

*   **Ping fails**: If `ping reservation.school.edu` doesn't work after 24 hours, double-check that the IP address in the DNS record is correct.
*   **"Site Not Secure"**: This means the DNS is working, but you haven't set up HTTPS yet. Follow the **Certbot** steps in `deploy_process.md`.
