import { Button, Card, Form, Input, message, Typography } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import Welcome from "../../../components/Welcome";
import { loginUser } from "../../../api/users-service";
import { useState } from "react";
import Cookies from "js-cookie";

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const onFinish = async (values: { email: string; password: string }) => {
    try {
      setLoading(true);
      const response = await loginUser(values);
      message.success(response.message || "Login successful");
      Cookies.set("token", response.token);
      navigate("/");

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Login failed";
      message.error(errorMessage);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Welcome
        title="Welcome Back"
        subtitle="Sign in to continue to your blog dashboard"
      />

      <div className="flex flex-1 items-center justify-center p-4 lg:flex-none lg:w-[480px]">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <div className="mb-8 text-center lg:text-left">
            <Title level={3} className="!mb-2">
              Sign In
            </Title>
            <Text type="secondary">Enter your credentials to access your account</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text type="secondary">
              Don't have an account?{" "}
              <Link to="/register" className="!text-blue-500">
                Sign up
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
