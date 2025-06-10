class TestClass:
    def method1(self):
        """
        This is a simple method with a docstring.
        """
        x = 1
        y = 2
        return x + y
    
    def method2(self, a, b):
        """
        This is a method with parameters.
        """
        result = 0
        for i in range(a):
            result += i
        
        for j in range(b):
            result += j * 2
        
        return result
    
    def method3(self):
        """
        This is a method with nested functions.
        """
        def nested_function():
            return 42
        
        return nested_function()

def standalone_function():
    """
    This is a standalone function.
    """
    return "Hello, world!"

def complex_function(n):
    """
    This is a more complex function with multiple loops and conditions.
    """
    result = 0
    
    if n <= 0:
        return 0
    
    for i in range(n):
        if i % 2 == 0:
            result += i
        else:
            result -= i
    
    while n > 0:
        result += n
        n -= 1
    
    return result
