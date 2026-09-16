import { Button, Card, Form, Input, message, Typography } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import Welcome from "../../../components/Welcome";
import { registerUser } from "../../../api/users-service";
import { useState } from "react";

const { Title, Text } = Typography;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const onFinish = async(values:never) => {
    try {
      setLoading(true);
      const response = await registerUser(values);
      message.success(response.message || "Registration successful");
      navigate("/login");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Welcome
        title="Join Our Community"
        subtitle="Create an account to start blogging today"
      />

      <div className="flex flex-1 items-center justify-center p-4 lg:flex-none lg:w-[480px]">
        <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
          <div className="mb-8 text-center lg:text-left">
            <Title level={3} className="!mb-2">
              Create Account
            </Title>
            <Text type="secondary">Fill in the form to get started</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="name"
              rules={[{ required: true, message: "Please enter your name" }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Full Name" />
            </Form.Item>

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

            <Form.Item
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your password" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match"));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm Password"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Sign Up
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text type="secondary">
              Already have an account?{" "}
              <Link to="/login" className="!text-blue-500">
                Sign in
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
