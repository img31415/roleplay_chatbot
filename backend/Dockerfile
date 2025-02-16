FROM python:3.12.2

WORKDIR /app

# Upgrade pip to the latest version inside the container
RUN pip install --upgrade pip

# Copy only requirements first to leverage Docker cache
COPY requirements.txt requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "app.py"]