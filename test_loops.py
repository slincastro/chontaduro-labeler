# Test file with loops to test LoopCountMetric

def test_function():
    # For loop
    for i in range(10):
        print(i)
    
    # While loop
    j = 0
    while j < 10:
        print(j)
        j += 1
    
    # For loop with list
    my_list = [1, 2, 3, 4, 5]
    for item in my_list:
        print(item)
    
    # For loop with enumerate
    for index, value in enumerate(my_list):
        print(f"Index: {index}, Value: {value}")
    
    # List comprehension with for
    squares = [x**2 for x in range(10)]
    print(squares)
    
    # Nested loops
    for x in range(3):
        for y in range(3):
            print(f"({x}, {y})")

if __name__ == "__main__":
    test_function()
