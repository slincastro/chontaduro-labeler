class TestClass:
    @classmethod
    def create_context(
        cls, user_id: str, email: str, *, chat_model: str = None, agent: str = None, context_id: str = None
    ) -> str:
        """
        This is a method with a multi-line signature.
        """
        if context_id is None:
            context_id = "123456"
        
        created_date = "2023-01-01"
        
        session = {
            "agent": agent,
            "user_id": user_id,
            "email": email,
            "context_id": context_id,
            "chat_model": chat_model,
            "created_date": created_date,
            "deleted": False,
        }
        
        db = cls.get_client()
        db.collection("chat-context").document(context_id).set(session)
        
        return session

    @staticmethod
    def get_client():
        """
        Mock method to get a client.
        """
        class MockDB:
            def collection(self, name):
                return self
            
            def document(self, id):
                return self
            
            def set(self, data):
                return None
        
        return MockDB()
